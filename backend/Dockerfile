# Use an official Python runtime as a parent image
FROM python:3.9-slim-bullseye

# Set the working directory in the container
WORKDIR /app

# Install system dependencies for psycopg2 and other packages
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies with trusted hosts for SSL certificate issues
RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create directory for certificates if it doesn't exist
RUN mkdir -p /app/certs

# Expose port 5000 for the Flask app
EXPOSE 5000

# Run Gunicorn to serve the Flask application
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "run:app"]
