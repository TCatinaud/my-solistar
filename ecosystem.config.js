module.exports = {
  apps: [
    {
      name: "my-solisart",
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
