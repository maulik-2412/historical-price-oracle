# historical-price-oracle

## It is price oracle app which uses Alchemy SDK and API for price finding. It also has interpolation method for finding values at timestamps which are not available.

### Frontend:
* Next.js
* Zustand

### Backend
* Express

### Database
* MongoDB

### Caching
* Redis

### External APIs
* Alchemy

For working on project in local environment go to
``bash
/frontend
`` 
Then run:
``bash
npm run dev
``
Go to:
``bash
/backend
``
Then run:
``bash
nodemon app.js
``
Set up MongoDB and Redis and add environment variables and you are good to go.

## I will add a progress bar in future for batch jobs.
