FROM eclipse-temurin:21-jdk AS build
WORKDIR /src

COPY . .
RUN sh build.sh test

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /src/build/impact-studio.jar \
    /app/build/impact-studio.jar

COPY --from=build /src/lib/postgresql-42.7.14.jar \
    /app/lib/postgresql-42.7.14.jar

# A fresh named volume inherits this directory's ownership.
RUN mkdir -p /var/lib/impact-studio \
    && chown 10001:10001 /var/lib/impact-studio

USER 10001:10001

ENV SERVER_PORT=8080 \
    STUDIO_BASE_PATH=/studio \
    STUDIO_BIND_ADDRESS=0.0.0.0

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/build/impact-studio.jar", "serve"]