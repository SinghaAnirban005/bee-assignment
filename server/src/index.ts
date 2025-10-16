import express, { Express, Request, Response } from "express"
import cors from "cors"
import dotenv from "dotenv"
import { PrismaClient } from "../../prisma/generated/prisma/client.js"
import { IndeedCrawler } from "./crawler/index.js"

export const prisma = new PrismaClient()

const app:Express = express()
dotenv.config()

app.use(express.json())
app.use(cors())

const PORT = process.env.PORT

app.get('/jobs', async(req: Request, res: Response) => {
    try {
        const { query, location, jobType,
      category,
      page = '1',
      limit = '10',
      sortBy = 'postedDate',
      sortOrder = 'desc' } = req.query

      const pageNum = parseInt(page as string)
      const limitNum = parseInt(limit as string)
      const skip = (pageNum - 1) * limitNum

      const where: any = {}

      if(query){
         where.OR = [
            { title: { contains: query as string, mode: 'insensitive' } },
            { company: { contains: query as string, mode: 'insensitive' } },
            { description: { contains: query as string, mode: 'insensitive' } }
         ]

         if(location){
            where.location = { 
                contains: location as string, mode: "insensitive"
            }
         }

         if(jobType){
            where.jobType = jobType
         }

         if(category){
            where.category = category
         }
      }

      const total = await prisma.job.count({where})

      if(!total){
        res.status(400).json({
            message: "Failed to get total"
        })
      }

      const jobs = await prisma.job.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
            [sortBy as string]: sortOrder
        }
      })

      if(!jobs){
        res.status(400).json({
            message: "No jobs available"
        })
        return
      }

      res.status(200).json({
        jobs: jobs,
        total: total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      })

      return
    } catch (error) {
        console.error("Error fetching jobs ", error)
        res.status(500).json({
            message: "Internal server error"
        })

        return
    }
})

app.get("/filters", async(req: Request, res: Response) => {
  try {
    const jobTypeFilter = await prisma.job.findMany({
      select: { jobType: true },
      distinct: ['jobType'],
      where: {
        NOT: [{ jobType: { equals: "" } }]
      }
    })
  
    const categoryFilter = await prisma.job.findMany({
      select: {
        category: true
      },
      distinct: ['category'],
      where: {
        NOT: [{ category: {not: ""}}]
      }
    })
  
    const locationFilter = await prisma.job.findMany({
      select: { location: true },
      distinct: ['location']
    })
  
    const [jobTypes, categories, locations] = await Promise.all([jobTypeFilter, categoryFilter, locationFilter])
  
    const flattenJobType = jobTypes.map(j => j.jobType)
    const flattenCategories = categories.map(c => c.category)
    const flattenLocation = locations.map(l => l.location)
  
    res.status(200).json({
      jobTypes: flattenJobType,
      categories: flattenCategories,
      locations: flattenLocation
    })
  
    return
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ error: 'Internal server error' });
    return
  }
})

app.listen(PORT, () => {
    console.log(`listening on PORT ${PORT}`)
    
    const crawler = new IndeedCrawler();
    crawler.crawl().catch(console.error);
})

export { app }