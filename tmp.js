var util = require('util');

var seneca = require('seneca')().client({
  port: 10301,
  pin: 'role:cd-dojos,cmd:*'
});

function print(err, result) {
  if (err) { return console.error(err); }
  console.log(util.inspect(result).replace(/\n/g,' '));
}

seneca.act({role:'cd-dojos', cmd:'list'}, print);
