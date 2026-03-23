module.exports = {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://melihtours.com',
    generateRobotsTxt: true,
    exclude: ['/agency/dashboard*', '/api/*', '/checkout*', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'],
    robotsTxtOptions: {
        policies: [
            { userAgent: '*', allow: '/' },
            { userAgent: '*', disallow: ['/api/', '/agency/', '/checkout', '/login', '/register'] },
        ],
        additionalSitemaps: [],
    },
}
