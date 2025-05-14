FROM mediawiki:1.39.7

WORKDIR /var/www/html

RUN apt-get update && apt-get install -y --no-install-recommends \
    unzip \
    libzip-dev \
    libpq-dev \
    wget \
    vim \
 && docker-php-ext-install zip \
 && docker-php-ext-configure pgsql --with-pgsql=/usr/lib/postgresql \
 && docker-php-ext-install pgsql \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

RUN curl -sS https://getcomposer.org/installer | php \
 && mv composer.phar /usr/local/bin/composer

COPY composer.local.json .
RUN composer self-update 2.1.3 && composer update --no-dev

COPY --chown=www-data:www-data . .

# RUN chown -R www-data:www-data /var/www/html
