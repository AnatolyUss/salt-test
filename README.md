# Salt test

<h3>In a nutshell</h3>
The service uses two DBs MongoDB and Redis, while Redis suppose to face about 99.99...% of traffic.
MongoDB is used as a backup, for a case of sudden Redis outage/restart.
Otherwise, MongoDB remains untouched.
Both DBs store the same data - validation models.

The service consists of two endpoints: <b>"POST /model"</b> and <b>"POST /request"</b>.
Incoming HTTP requests are thoroughly validated for both endpoints.

<h3>"POST /model":</h3>
Inserts/updates validation models in both MongoDB and Redis.
In case of failure on behalf of one or both of DBs - the operation will be rolled back in both DBs.
The models are saved with two precalculated fields to enable processing of <b>"POST /request"</b> input in O(n) time complexity.

<h3>"POST /request":</h3>
Receives incoming request and processes it to detect anomalies.
It will run only once through input params to detect anomalies (O(n) time complexity).
As requested in task's description, anomalies detection is implemented without any third party tool.

<h3>Potential improvements:</h3>
1. Enable <b>"POST /model"</b> to process bulk of models.
2. Add the path-method composite unique index to MongoDB's <b>"models"</b> collection.
3. Add <b>"/liveness"</b> and <b>"/readiness"</b> endpoints, to enable service discovery (k8s).
4. Add more tests.

<h3>How to run:</h3>
1. Install Node.js, either directly, or, for example, via nvm.
2. Install and run Docker and Docker-compose.
3. Unzip the "salt-test" package, and put it in your preferred directory.
4. "cd" to chosen directory.
5. Run Docker-compose, something like: <code>/usr/local/bin/docker compose -f /path/to/salt-test/docker-compose.yml -p salt-test up -d</code>
6. Install dependencies: <code>npm i</code>
7. Build the project: <code>npm run build</code>
8. To test the service: <code>npm test</code>
9. To start the service: <code>npm start</code>
