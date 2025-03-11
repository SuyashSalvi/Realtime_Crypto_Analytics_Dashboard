# Cryptocurrency Analytics Dashboard

## Overview
The Cryptocurrency Analytics Dashboard is an advanced tool designed to provide real-time insights and predictive analytics on cryptocurrency markets. Built with Next.js, Recharts, and the CoinGecko API, it offers interactive visualizations, predictive modeling, and DeFi metrics integration to help traders and investors make informed decisions.

![Dashboard Screenshot](/public/dashboard_screenshot.png)

## Features

- **Real-Time Data Visualization**: Interactive charts displaying price movements, volume trends, and market distributions.
- **Predictive Analytics**: Price forecasting using SMA-based models to anticipate market trends.
- **DeFi Integration**: Displays real-time Total Value Locked (TVL) and other relevant DeFi statistics.
- **Responsive Design**: Fully responsive web application that adapts to various devices and screen sizes.
- **Cloud-Hosted**: Robust and scalable infrastructure hosted on AWS.

## Technologies Used

- **Frontend**: Next.js, Recharts for charting, Framer Motion for animations
- **Backend**: Node.js, hosted on AWS
- **APIs**: CoinGecko API for fetching real-time cryptocurrency data
- **Databases**: PostgreSQL, MongoDB
- **Containerization**: Docker

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- Docker (optional)
- An AWS account (if deploying to AWS)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/crypto-dashboard.git
   cd crypto-dashboard
   ```
2.	Install dependencies:
```
npm install
```

3.	Set up environment variables:
```
cp .env.example .env
# Edit .env with your specific keys and secrets
```

4.	Run the application locally:
```
npm run dev
```


### Deployment

To deploy on AWS, follow these steps (ensure you have the AWS CLI configured):
1.	Build the Docker image:
```
docker build -t crypto-dashboard .
```

2.	Push your image to an AWS ECR repository:
```
# Create a new repository if needed
aws ecr create-repository --repository-name crypto-dashboard

# Push the image
docker push your-aws-ecr-url/crypto-dashboard:latest
```

3.	Deploy using your preferred method (ECS, EKS, or with an EC2 instance).

### Usage

Navigate to the deployed URL or run locally to access the dashboard. Use the controls provided on the UI to switch between different cryptocurrencies, adjust the time range, or toggle between different data visualizations like predictive analytics or the DeFi metrics.



