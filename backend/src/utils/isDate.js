const moment = require('moment');

module.exports = (date) => (date === undefined && !moment(date, moment.ISO_8601, true).isValid());
