import dotenv from 'dotenv'
import isProd from './isprod.js'
if (!isProd) {
  dotenv.config()
}