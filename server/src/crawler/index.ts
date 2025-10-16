import puppeteer from 'puppeteer';
import { prisma } from '../index.js';

interface IndeedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  jobType?: string;
  applyUrl: string;
  postedDate: string;
  sourceId: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

class IndeedCrawler {
  private baseUrl = 'https://www.indeed.com';
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2
  };

  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ];

  async crawl(location = 'remote', maxPages = 3) {
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
        '--window-size=1920,1080'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });

    try {
      for (let currentPage = 0; currentPage < maxPages; currentPage++) {

        if (currentPage > 0) {
          const pageDelay = 15000 + Math.random() * 10000;
          console.log(`Waiting ${Math.round(pageDelay/1000)}s before next page...`);
          await this.delay(pageDelay);
        }

        const listingPage = await browser.newPage();
        await this.makePageStealthy(listingPage);
        
        console.log(`Crawling page ${currentPage + 1}...`);
        
        const start = currentPage * 10;
        const url = `${this.baseUrl}/jobs?l=${encodeURIComponent(location)}&start=${start}`;

        const jobs = await this.retryWithBackoff(
          () => this.crawlJobListings(listingPage, url),
          `crawl job listings page ${currentPage + 1}`
        );

        if (!jobs || jobs.length === 0) {
          console.log(`No jobs found on page ${currentPage + 1}, stopping crawl.`);
          await listingPage.close();
          break;
        }

        const detailPage = await browser.newPage();
        await this.makePageStealthy(detailPage);

        for (const job of jobs) {
          if (job.applyUrl) {
            await this.retryWithBackoff(
              () => this.crawlJobDetail(detailPage, job),
              `crawl job detail for ${job.title}`
            );

            await this.delay(3000 + Math.random() * 5000);
          }
        }

        await detailPage.close();

        await this.retryWithBackoff(
          () => this.saveJobs(jobs),
          `save jobs from page ${currentPage + 1}`
        );

        console.log(`Successfully processed ${jobs.length} jobs from page ${currentPage + 1}`);
        await listingPage.close();
      }

    } catch (error) {
      console.error('Crawling error:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  private async makePageStealthy(page: puppeteer.Page): Promise<void> {
    const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    await page.setUserAgent(userAgent as string);
    
    // Setting realistic viewport
    await page.setViewport({ 
      width: 1920, 
      height: 1080,
      deviceScaleFactor: 1
    });

    // Remove webdriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });

    // Add plugins to make it look more real
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
    });

    // Overwrite the languages property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

    // Pass the Chrome Test
    await page.evaluateOnNewDocument(() => {
      (window as any).chrome = {
        runtime: {},
      };
    });

    // Pass the Permissions Test
    await page.evaluateOnNewDocument(() => {
      const originalQuery = window.navigator.permissions.query;
      (window.navigator.permissions as any).query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission } as PermissionStatus) :
          originalQuery(parameters)
      );
    });

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    });
  }

  private async crawlJobListings(page: puppeteer.Page, url: string): Promise<IndeedJob[]> {
    try {
      console.log(`Navigating to: ${url}`);
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 45000 
      });
      
      await this.delay(2000 + Math.random() * 3000);

      await this.humanScroll(page);
      
      const hasCaptcha = await page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        return bodyText.includes('captcha') || 
               bodyText.includes('unusual activity') ||
               bodyText.includes('verify you are human') ||
               document.querySelector('iframe[src*="recaptcha"]') !== null;
      });

      if (hasCaptcha) {
        console.error('CAPTCHA detected! Stopping crawl.');
        console.log('Tips to avoid CAPTCHA:');
        console.log('1. Increase delays between requests');
        console.log('2. Use residential proxies');
        console.log('3. Reduce the number of pages crawled per session');
        console.log('4. Consider using Indeed\'s official API if available');
        return [];
      }

      try {
        await page.waitForSelector('.job_seen_beacon', { timeout: 15000 });
      } catch (error) {
        console.log('No job cards found within timeout');
        
        const pageTitle = await page.title();
        console.log('Page title:', pageTitle);
        
        try {
          await page.screenshot({ path: `debug-page-${Date.now()}.png` });
          console.log('Screenshot saved for debugging');
        } catch (e) {
          console.log('Could not save screenshot');
        }
        
        return [];
      }

      const jobs = await page.evaluate((baseUrl: string) => {
        const jobCards = document.querySelectorAll('.job_seen_beacon');
        const results: IndeedJob[] = [];

        jobCards.forEach((card) => {
          const titleElement = card.querySelector('h2.jobTitle a');
          const companyElement = card.querySelector('[data-testid="company-name"]');
          const locationElement = card.querySelector('[data-testid="text-location"]');
          const salaryElement = card.querySelector('.salary-snippet-container');
          
          if (titleElement) {
            const title = titleElement.textContent?.trim() || '';
            const relativeUrl = titleElement.getAttribute('href');
            const applyUrl = relativeUrl ? baseUrl + relativeUrl : '';
            
            const jobIdMatch = relativeUrl?.match(/jk=([^&]+)/);
            const sourceId = jobIdMatch ? jobIdMatch[1] : '';

            const job: IndeedJob = {
              title,
              company: companyElement?.textContent?.trim() || '',
              location: locationElement?.textContent?.trim() || '',
              description: '',
              salary: salaryElement?.textContent?.trim() || "",
              applyUrl,
              postedDate: new Date().toISOString().split('T')[0] as string,
              sourceId: sourceId as string
            };

            results.push(job);
          }
        });

        return results;
      }, this.baseUrl);

      console.log(`Found ${jobs.length} jobs on this page`);
      return jobs;

    } catch (error) {
      console.error(`Error crawling job listings from ${url}:`, error);
      throw error;
    }
  }

  private async humanScroll(page: puppeteer.Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight / 2) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  private async crawlJobDetail(page: puppeteer.Page, job: IndeedJob): Promise<void> {
    try {
      await page.goto(job.applyUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 20000 
      });
      
      await this.delay(1000 + Math.random() * 2000);

      const description = await page.evaluate(() => {
        const selectors = [
          '#jobDescriptionText',
          '.jobsearch-JobComponent-description',
          '.description',
          '[data-testid="job-description"]'
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            return element.textContent?.trim() || '';
          }
        }
        
        return '';
      });

      job.description = description.substring(0, 2000) || '';

    } catch (error) {
      console.error(`Failed to crawl job detail: ${job.title}`, error);
      job.description = 'Description not available';
    }
  }

  private async saveJobs(jobs: IndeedJob[]): Promise<void> {
    for (const job of jobs) {
      try {
        await prisma.job.upsert({
          where: {
            source_sourceId: {
              source: 'indeed',
              sourceId: job.sourceId
            }
          },
          update: {
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            salary: job.salary || "",
            applyUrl: job.applyUrl,
            postedDate: job.postedDate,
            updatedAt: new Date()
          },
          create: {
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            salary: job.salary as string,
            jobType: this.inferJobType(job.title, job.description) || "",
            category: this.inferCategory(job.title, job.description) || "",
            applyUrl: job.applyUrl,
            postedDate: job.postedDate,
            source: 'indeed',
            sourceId: job.sourceId
          }
        });
        console.log(`Saved job: ${job.title}`);
      } catch (error) {
        console.error(`Error saving job ${job.title}:`, error);
      }
    }
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...this.retryConfig, ...config };
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (this.isTransientError(error) && attempt < retryConfig.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt, retryConfig);
          console.warn(
            `Attempt ${attempt + 1}/${retryConfig.maxRetries + 1} failed for ${operationName}. ` +
            `Retrying in ${delay}ms. Error: ${error}`
          );
          
          await this.delay(delay);
          continue;
        }
        
        break;
      }
    }
    
    console.error(`All ${retryConfig.maxRetries + 1} attempts failed for ${operationName}`);
    throw lastError!;
  }

  private isTransientError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.toString().toLowerCase();
    
    if (errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('econnreset') ||
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('eai_again') ||
        errorMessage.includes('socket') ||
        errorMessage.includes('navigation timeout')) {
      return true;
    }

    if (errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('429') ||
        errorMessage.includes('5xx')) {
      return true;
    }

    if (errorMessage.includes('target closed') ||
        errorMessage.includes('session closed') ||
        errorMessage.includes('detached from target')) {
      return true;
    }

    if (errorMessage.includes('captcha') ||
        errorMessage.includes('blocked') ||
        errorMessage.includes('access denied')) {
      return true;
    }

    return false;
  }

  private calculateBackoffDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt);
    const jitter = Math.random() * 1000;
    const delay = Math.min(exponentialDelay + jitter, config.maxDelay);
    return delay;
  }

  private inferJobType(title: string, description: string): string {
    const text = (title + ' ' + description).toLowerCase();
    if (text.includes('full') && text.includes('time')) return 'full-time';
    if (text.includes('part') && text.includes('time')) return 'part-time';
    if (text.includes('contract')) return 'contract';
    if (text.includes('intern')) return 'internship';
    if (text.includes('freelance')) return 'freelance';
    return 'full-time';
  }

  private inferCategory(title: string, description: string): string {
    const text = (title + ' ' + description).toLowerCase();
    if (text.includes('software') || text.includes('developer') || text.includes('engineer') || text.includes('programming')) return 'Engineering';
    if (text.includes('market')) return 'Marketing';
    if (text.includes('sale')) return 'Sales';
    if (text.includes('design') || text.includes('ui') || text.includes('ux')) return 'Design';
    if (text.includes('product') || text.includes('pm')) return 'Product';
    if (text.includes('data') || text.includes('analyst') || text.includes('science')) return 'Data';
    if (text.includes('devops') || text.includes('sre')) return 'DevOps';
    return 'Other';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { IndeedCrawler };