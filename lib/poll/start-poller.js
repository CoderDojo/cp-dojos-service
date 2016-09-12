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
 function startPoll (args, done) {
   var seneca = this;
   var plugin = args.role;
   var jobs = [
     {act: 'queue_email_poll', after: 0},
     {act: 'queue_sms_poll', after: 1000 * 60 * 60 * 24 * 2} // after = 2 days
   ];
   var query = args.query || {};
   var pollId = args.pollId;
   var limit = args.limit || 200;

   var updatePoll = function (wfCb) {
     seneca.act({role: plugin, cmd: 'save_poll_setup', poll: {id: pollId, startedAt: new Date()}}, function (err){
       if (err) return done(err);
       return wfCb(null);
     });
   };

   var enqueue = function (wfCb) {
     // We first do a dryRun to get the size of our pool so we can split the batches properly
     async.eachSeries(jobs, function (job, eachCb) {
       query.limit$ = limit;
       query.skip$ = 0;
       seneca.act({role: plugin, cmd: 'get_polled_list', query: query}, function (err, dojos){
         if (err) return done(err);
         var count = dojos.length;
          //Loop over the max number recovered from dryRun divided by the limit of each batch
          //In order to get batches of limit size, delayed by a progressive {interval} min
          async.timesSeries(Math.ceil(count / limit), function (polledIndex, next) {
            var payload = {role: plugin, cmd: job.act, query: query, pollId: pollId};
            seneca.act({role: 'kue-queue', cmd: 'enqueue', name: 'batch-poller', msg: _.clone(payload), params: {
              delay: (polledIndex * 60 * 1000) + job.after
            }}, function (err, status) {
             if (err) return done({msg: err, info: {start: query.skip$, pollId: pollId}});
               query.skip$ = limit * (polledIndex + 1);
               next();
             });
          }, eachCb);
       });
     }, wfCb);
   };

  async.waterfall([
    updatePoll,
    enqueue
  ], function (err, jobs) {
    done(err, jobs);
  });
 }

 module.exports = startPoll;
