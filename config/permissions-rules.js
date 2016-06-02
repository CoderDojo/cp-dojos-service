module.exports = function () {

/*
* Format of a permission {
* role: {'basic-user':{match: false}}
* permissions: []
* customValidator: functionName
* }
*/

  return {
    // As a public act, does not requires to be defined, but this is still supported in order to ensure no blocage/misunderstanding
    'list': [{
      role: 'none',
      customValidator: [
        // {role:'cd-dojos', cmd:'own_dojo'}, 
        {role: 'cd-dojos', cmd: 'have_permissions'}]
    }],
    'poll_count': [{
      role: 'basic-user'
    }],
    'save_poll_result': [{
      role: 'basic-user',
      userType: 'champion',
      extendedUserTypes: true
    }],
    'get_stats': [{
      role: 'cdf-admin'
    }]

  };
};
