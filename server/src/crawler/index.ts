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

  async crawl(location = 'remote', maxPages = 3) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });

      for (let currentPage = 0; currentPage < maxPages; currentPage++) {
        console.log(`Crawling page ${currentPage + 1}...`);
        
        const start = currentPage * 10;
        const url = `${this.baseUrl}/jobs?l=${encodeURIComponent(location)}&start=${start}`;

        const jobs = await this.retryWithBackoff(
          () => this.crawlJobListings(page, url),
          `crawl job listings page ${currentPage + 1}`
        );

        if (!jobs || jobs.length === 0) {
          console.log(`No jobs found on page ${currentPage + 1}, stopping crawl.`);
          break;
        }

        for (const job of jobs) {
          if (job.applyUrl) {
            await this.retryWithBackoff(
              () => this.crawlJobDetail(page, job),
              `crawl job detail for ${job.title}`
            );
            
            await this.delay(1000 + Math.random() * 2000);
          }
        }

        await this.retryWithBackoff(
          () => this.saveJobs(jobs),
          `save jobs from page ${currentPage + 1}`
        );

        console.log(`Successfully processed ${jobs.length} jobs from page ${currentPage + 1}`);

        await this.delay(2000 + Math.random() * 3000);
      }

    } catch (error) {
      console.error('Crawling error:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  private async crawlJobListings(page: puppeteer.Page, url: string): Promise<IndeedJob[]> {
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      try {
        await page.waitForSelector('.job_seen_beacon', { timeout: 15000 });
      } catch (error) {
        console.log('No job cards found within timeout, may be no results or different page structure');
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

      return jobs;

    } catch (error) {
      console.error(`Error crawling job listings from ${url}:`, error);
      throw error;
    }
  }

  private async crawlJobDetail(page: puppeteer.Page, job: IndeedJob): Promise<void> {
    try {
      await page.goto(job.applyUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 15000 
      });
      
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
    
    // Transient network errors
    if (errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('econnreset') ||
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('eai_again') ||
        errorMessage.includes('socket') ||
        errorMessage.includes('navigation timeout')) {
      return true;
    }

    // Rate limiting or temporary blocking
    if (errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('429') ||
        errorMessage.includes('5xx')) {
      return true;
    }

    // Puppeteer specific transient errors
    if (errorMessage.includes('target closed') ||
        errorMessage.includes('session closed') ||
        errorMessage.includes('detached from target')) {
      return true;
    }

    // Indeed-specific transient issues
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