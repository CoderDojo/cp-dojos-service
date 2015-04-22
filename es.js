var plugin = 'cd-es-dojos';

function Elasticsearch() {
  var seneca = this;
  var plugin = 'cd-dojos-elasticsearch';

  seneca.add({role: plugin, cmd: 'search'}, cmd_search);
}

function cmd_search(args, done) {
  var seneca = this;

  seneca.act('role:search,cmd:search', args, function(err, results) {
    if(err) {
      return done(err);
    }
    return results;
  });
}

module.exports = Elasticsearch;

