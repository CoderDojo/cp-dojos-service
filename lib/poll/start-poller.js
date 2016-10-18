 var async = require('async');
 var _ = require('lodash');


// curl -d '{"role": "cd-dojos", "cmd":"start_poll", "pollId":1}' http://localhost:10301/act
// curl -d '{"role": "cd-dojos", "cmd":"start_poll", "pollId":1, "query": {"alpha2": "JK"}}' http://localhost:10301/act

// Schedule a job to enqueue the next {{interval}} emails
// When this job is finished, verify if it's the latest
// If it's not, re-enqueue with the next emails

// When emails have reached the max amount, take the current time (startTime + n*interval (+n*sendingTime) ) and
//  add Interval to Polling Method 2  (2 days) to get the start Date of the next Polling phase
//  schedule a job for this date and apply again the schedule with interval
 /**
  * Start a poll by sending it to the list of dojos filterd by the query param
  * @param  {Object} query filter of dojos to send the poll to
  * @param  {String} pollId Poll to send
  * @param  {Integer} split Size of batches to queue (default 200)
  */
 function startPoll (args, done) {
   var seneca = this;
   var plugin = args.role;
   var jobs = [
     {act: 'queue_email_poll', after: 0},
     {act: 'queue_sms_poll', after: 1000 * 60 * 60 * 24 * 2} // after = 2 days
   ];
   var query = args.query || {};
   var pollId = args.pollId;
   var split = args.split || 200;
   var poll = {};

   if (query.limit$ || query.skip$) return done(new Error('limit$ and skip$ are non-deterministic filters and cannot be supported'));

   var updatePoll = function (wfCb) {
     seneca.act({role: plugin, cmd: 'save_poll_setup', poll: {id: pollId, startedAt: new Date()}}, function (err, savedPoll) {
       if (err) return done(err);
       return wfCb(null);
     });
   };

   var getPoll = function(wfCb) {
     seneca.act({role: plugin, cmd: 'get_poll_setup', query: {id: pollId}}, function (err, polls) {
       if (err) return done(err);
       poll = polls[0];
       wfCb(null);
     });
   };

   var enqueue = function (wfCb) {
     // We first do a dryRun to get the size of our pool so we can split the batches properly
     async.eachSeries(jobs, function (job, eachCb) {
       query.skip$ = 0;
       query.limit$ = 0; // Not required, but enforced, see error handling @line 33
       var offset = 0;
       seneca.act({role: plugin, cmd: 'get_polled_list', query: query}, function (err, dojos) {
         if (err) return done(err);
         query.limit$ = split;
         var count = dojos.length;
          // Loop over the max number recovered from dryRun divided by the splitSize of each batch
          // In order to get batches of splitted size, delayed by a progressive {interval} min
          async.timesSeries(Math.ceil(count / split), function (polledIndex, next) {
            var payload = {role: plugin, cmd: job.act, query: query, poll: poll};
            seneca.act({role: 'kue-queue', cmd: 'enqueue', name: 'batch-poller', msg: _.clone(payload), params: {
              delay: (polledIndex * 60 * 1000) + job.after
            }}, function (err, status) {
             if (err) return done({msg: err, info: {start: offset, pollId: pollId}});
               query.skip$ = split * (polledIndex + 1);
               next();
             });
          }, eachCb);
       });
     }, wfCb);
   };

  async.waterfall([
    updatePoll,
    getPoll,
    enqueue
  ], function (err, jobs) {
    done(err, jobs);
  });
 }

 module.exports = startPoll;
