/**
 * Save a poll result.
 * @param  {Object}   poll [poll row]
 */
 // curl -d '{"role": "cd-dojos", "cmd":"save_poll_result", "poll": {"poll_id": "cf8a3765-dec4-4d4c-bc66-a15fb3c758f2", "value": "a", "dojo_id": "25ab65b9-0787-4963-b5aa-3a6de82b9d7e" }}' http://localhost:10301/act
function savePollResult (args, done) {
  var seneca = this;
  var plugin = args.role;
  var ENTITY_NS = ('cd/polls_results');
  var pollResult = args.poll;
  //TODO : add max_answers restriction
  pollResult.createdAt = new Date();
  seneca.make$(ENTITY_NS).save$(pollResult, done);
}

module.exports = savePollResult;
