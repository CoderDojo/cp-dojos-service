var async = require('async');
var cloud = require('pkgcloud');
var stream = require('stream');

function updateImage (args, done) {
  var seneca = this;
  var plugin = args.role;

  //  NOTE: won't work locally, sorry dear opensource contributors :(
  //  TODO: Maybe should we open an "opened test" bucket, but that would be.. troublesome for security reasons & $$
  var s3client = cloud.storage.createClient({
    provider: 'amazon',
    /* Uncomment the following to make it work with fakes3
    protocol: 'http://',
    serversUrl: 's3:80',
    forcePathBucket: true,
    */
    accessKeyId: process.env.AMAZON_BUCKET_ACCESSKEYID,
    accessKey: process.env.AMAZON_BUCKET_ACCESSKEY
  });

  async.waterfall ([
    getContainer,
    removeExistingFile,
    uploadNewFile],
  done);

  function getContainer (wfCb){
    return s3client.getContainer('zen-dojo-images', wfCb);
  }

  //  pkgcloud doesn't allow to overwrite, while s3 does. Too late to change, we just ensure it's deleted first
  function removeExistingFile (container, wfCb) {
    return s3client.removeFile(container, args.dojoId, wfCb);
  }

  function uploadNewFile (wfCb) {
    var writeStream = s3client.upload({
       container: 'zen-dojo-images',
       remote: args.dojoId
     });

     writeStream.on('error', function(err) {
       // handle your error case
       console.log('error on upload', err);
     });

     writeStream.on('success', function(file) {
       // success, file will be a File model
       done();
     });

    // Initiate the source
    var fileStream = new stream.PassThrough();

    // Write your buffer
    var fileArrayBuffer = new Uint8Array(args.file.data);
    var buffer = new Buffer( fileArrayBuffer );
    fileStream.end(buffer);

    fileStream.pipe(writeStream);
  }
}

module.exports = updateImage;
