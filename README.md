# dojos core-service

## Install:

```
npm install
```

## Database:

This service requires it's own PostgreSQL database to run:

- using pgAdmin connect to PostgreSQL database:
- `docker ps` to make sure the PostgreSQL container is running
- use the `boot2docker ip` as the ip address (this is usually 192.168.59.103)
- user: postgres passwd: blank
- create a new database called `cp-dojos-development`
- next create a new user, right click on 'Login Roles' and select 'New Login Role'
		(note: you need to create this new user only if you don't have it already)
- username: 'platform'
- password: 'QdYx3D5y'
- give the user All Role Privileges

## Configuration

Ensure configuration file for the running environment exists and has the correct options. Default environment is development, options read from `config/config.js` - environment overrides in `config/<environment>.env`.

## Run

Start Server:

`./start.sh development ./service.js`

