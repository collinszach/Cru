FROM postgis/postgis:16-3.5

# Install pgvector from the PostgreSQL apt repo (already configured in base image)
RUN apt-get update \
    && apt-get install -y postgresql-16-pgvector \
    && rm -rf /var/lib/apt/lists/*
