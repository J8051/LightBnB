const properties = require('./json/properties.json');
const users = require('./json/users.json');

const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1`, [email])
    .then((result) => {
      return result.rows[0] || null;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then((result) => {
      return result.rows[0] || null;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  return pool
    .query(`INSERT INTO users(name, email, password)
    VALUES($1,$2,$3) RETURNING *`, [user.name, user.email, user.password])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
    .query(`SELECT reservations.*, properties.*, avg(property_reviews.rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2`, [guest_id, limit])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  const queryParams = [];
  let queryString = `
    SELECT properties.*, average_rating
    FROM properties
    JOIN (SELECT property_id, avg(property_reviews.rating) AS average_rating
          FROM property_reviews
          GROUP BY property_id
    ) AS prop_reviews ON prop_reviews.property_id = properties.id
    `;
  const queryConditions = [];
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryConditions.push(`city LIKE $${queryParams.length}`);
  }
  if (options.owner_id) {
    queryParams.push(`${options.owner_id}`);
    queryConditions.push(`owner_id = $${queryParams.length}`);
  }
  if (options.minimum_price_per_night) {
    queryParams.push(`${options.minimum_price_per_night * 100}`);
    queryConditions.push(`cost_per_night >= $${queryParams.length}`);
  }
  if (options.maximum_price_per_night) {
    queryParams.push(`${options.maximum_price_per_night * 100}`);
    queryConditions.push(`cost_per_night <= $${queryParams.length}`);
  }
  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    queryConditions.push(`average_rating >= $${queryParams.length}`);
  }

  if (queryConditions.length > 0) {
    queryString += `WHERE ${queryConditions.join(" AND ")}`;
  }

  queryParams.push(limit);
  queryString += `
    GROUP BY properties.id, average_rating 
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;
 
  return pool.query(queryString, queryParams).then((res) => res.rows);

};
exports.getAllProperties = getAllProperties;



/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const queryParams = [];
  let queryString = `INSERT INTO properties (
    owner_id,  
    title,
      description,
      thumbnail_photo_url,
      cover_photo_url,
      cost_per_night,
      street,
      city,
      province,
      post_code,
      country,
      parking_spaces,
      number_of_bathrooms,
      number_of_bedrooms
    )`;

  queryParams.push(`${property.owner_id}`);
  queryString += `VALUES ($${queryParams.length},`;

  queryParams.push(`${property.title}`);
  queryString += `$${queryParams.length},`;

  queryParams.push(`${property.description}`);
  queryString += `$${queryParams.length},`;

  queryParams.push(`${property.thumbnail_photo_url}`);
  queryString += `$${queryParams.length},`;

  queryParams.push(`${property.cover_photo_url}`);
  queryString += `$${queryParams.length},`;

  queryParams.push(`${property.cost_per_night *100}`);
  queryString += `$${queryParams.length},`;

  queryParams.push(`${property.street}`);
  queryString += `$${queryParams.length},`;

  queryParams.push(`${property.city}`);
  queryString += `$${queryParams.length},`;

  queryParams.push(`${property.provice}`);
  queryString += `$${queryParams.length},`;

  queryParams.push(`${property.post_code}`);
  queryString += `$${queryParams.length},`;

  queryParams.push(`${property.country}`);
  queryString += `$${queryParams.length},`;

  queryParams.push(`${property.parking_spaces}`);
  queryString += `$${queryParams.length},`;

  queryParams.push(`${property.number_of_bathrooms}`);
  queryString += `$${queryParams.length},`;

  queryParams.push(`${property.number_of_bedrooms}`);
  queryString += `$${queryParams.length})RETURNING *;`;

  return pool.query(queryString, queryParams).then((res) => res.rows);
};
exports.addProperty = addProperty;
