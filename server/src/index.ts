import express from "express"
import { Express } from "express"
import cors from "cors"
import dotenv from "dotenv"

const app:Express = express()
dotenv.config()

app.use(express.json())
app.use(cors())

const PORT = process.env.PORT

app.listen(PORT, () => {
    console.log(`listening on PORT ${PORT}`)
})

export { app }