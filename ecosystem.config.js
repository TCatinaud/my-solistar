module.exports = {
  apps: [
    {
      name: "home-energy",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: process.cwd(),
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
}
