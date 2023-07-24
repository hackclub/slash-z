// detects whether or not we're on staging
// returns true if NODE_ENV === "production" otherwise false
const isProd = process.env.NODE_ENV === "production";
export default isProd;
