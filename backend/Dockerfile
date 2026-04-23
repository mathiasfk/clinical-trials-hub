# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ClinicalTrialsHub.sln ./
COPY Directory.Build.props Directory.Packages.props global.json ./
COPY src/ClinicalTrialsHub.Domain/ src/ClinicalTrialsHub.Domain/
COPY src/ClinicalTrialsHub.Application/ src/ClinicalTrialsHub.Application/
COPY src/ClinicalTrialsHub.Infrastructure/ src/ClinicalTrialsHub.Infrastructure/
COPY src/ClinicalTrialsHub.Api/ src/ClinicalTrialsHub.Api/

RUN dotnet restore src/ClinicalTrialsHub.Api/ClinicalTrialsHub.Api.csproj
RUN dotnet publish src/ClinicalTrialsHub.Api/ClinicalTrialsHub.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ClinicalTrialsHub.Api.dll"]
