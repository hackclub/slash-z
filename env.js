import dotenv from 'dotenv'
import isProd from './isprod'

if (isProd) {
  dotenv.config()
}