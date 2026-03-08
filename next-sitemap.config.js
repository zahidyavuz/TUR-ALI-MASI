module.exports = {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://melihtours.com',
    generateRobotsTxt: false, // We already use a custom robots.txt
    exclude: ['/agency/dashboard*', '/api/*'],
}
