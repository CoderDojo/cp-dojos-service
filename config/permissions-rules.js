module.exports = function () {

/*
* Format of a permission {
* role: 'basic-user' || {'basic-user':{match: true}}
* customValidator: functionName
* }
*/

//  TODO:50 ensure is_own_dojo for dojo-admin && belongs_to for champion

  return {
    'cd-dojos':{
      'get_dojo_config': [{
        role: 'none'
      }],
      'search_bounding_box': [{
        role: 'none'
      }],
      //Used by front-e resolver, must restrict fields
      'find': [{
        role: 'none'
      }],
      'search': [{
        role: 'cdf-admin'
      }],
      'create': [{
        role: 'basic-user',
        userType: 'parent-guardian'
      },
      { role: 'basic-user',
        userType: 'champion'
      },
      { role: 'basic-user',
        userType: 'mentor'
      }],
      'update': [{
        role: 'basic-user',
        customValidator: [{
            role: 'cd-dojos',
            cmd: 'have_permissions_on_dojo',
            perm: 'dojo-admin'
        }]
      }],
      'update_image': [{
        role: 'basic-user',
        customValidator: [{
            role: 'cd-dojos',
            cmd: 'have_permissions_on_dojo',
            perm: 'dojo-admin'
        }]
      }],
      'delete': [{
        role: 'cdf-admin',
      }],
      'dojos_by_country': [{
        role: 'none'
      }],
      'list': [{
        role: 'none',
      }],
      'my_dojos': [{
        role: 'basic-user'
      }],
      'load': [{
        role: 'none'
      }],
      'bulk_update': [{
        role: 'cdf-admin'
      }],
      'bulk_delete': [{
        role: 'cdf-admin'
      }],
      'uncompleted_dojos': [{
        role: 'basic-user',
        userType: 'champion',
        extendedUserTypes: true
      }],

      'get_stats': [{
        role: 'cdf-admin'
      }],

      //  We can't enforce to be a champion, elsewhat no user appart from champion can start a dojo
      //  NOTE : No need for a check if the user is the one who started this lead if the args extend user
      'save_dojo_lead': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-dojos',
          cmd: 'is_own_lead'
        }]
      }],
      'update_dojo_lead': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-dojos',
          cmd: 'is_own_lead'
        }]
      }],

      'load_user_dojo_lead': [{
        role: 'basic-user'
      }],
      'load_dojo_lead': [{
        role: 'basic-user',
        userType: 'champion',
        extendedUserTypes: true,
        customValidator: [{
          role: 'cd-dojos',
          cmd: 'own_dojo'
        }]
      }, {
        role: 'cdf-admin'
      }],
      //  TODO:140 strengthen ?
      'search_dojo_leads': [{
        role: 'basic-user'
      }],

      'load_setup_dojo_steps': [{
        role: 'basic-user'
      }],

      //  TODO:120 split as "belongs_to_dojo"
      'load_usersdojos': [{
        role: 'basic-user'
      }],

      'load_dojo_users': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-dojos',
          cmd: 'have_permissions_on_dojo',
          perm: 'dojo-admin'
        }]
      }],

      'dojos_for_user': [{
        role: 'basic-user'
      }],

      //  TODO:130 split join from manage userdojos
      'save_usersdojos': [{
        role: 'basic-user'
      }],
      'remove_usersdojos': [ {
        role: 'basic-user',
        customValidator:[{
          role: 'cd-users',
          cmd: 'is_self'
        }]
      }, {
        role: 'basic-user',
        customValidator:[{
          role: 'cd-dojos',
          cmd: 'have_permissions_on_dojo',
          perm: 'dojo-admin'
        }]
      }, {
        role: 'basic-user',
        userType: 'parent-guardian',
        customValidator:[{
          role: 'cd-users',
          cmd: 'is_parent_of'
        }]
      }
    ],
      'export_dojo_users': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-dojos',
          cmd: 'have_permissions_on_dojo',
          perm: 'dojo-admin'
        }]
      }],
      'generate_user_invite_token': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-dojos',
          cmd: 'have_permissions_on_dojo',
          perm: 'dojo-admin'
        }]
      }],
      'accept_user_invite': [{
        role: 'basic-user'
      }],
      'request_user_invite': [{
        role: 'basic-user'
      }],
      'accept_user_request': [{
        // No validator here as check is post-recovery of data
        role: 'basic-user'
      }],
      'search_join_requests': [{
        role: 'basic-user',
        customValidator: [{
          role: 'cd-dojos',
          cmd: 'have_permissions_on_dojo',
          perm: 'dojo-admin'
        }]
      }],
      'decline_user_request': [{
        // No validator here as check is post-recovery of data
        role: 'basic-user'
      }],

      'update_founder': [{
        role: 'basic-user',
        userType: 'champion',
        customValidator: [{
          role: 'cd-dojos',
          cmd: 'is_founder'
        }]
      }],


      'notify_all_members': [
      {
        role: 'basic-user',
        customValidator: [{
          role: 'cd-dojos',
          cmd: 'have_permissions_on_dojo',
          perm: 'dojo-admin'
        }]
      }],

      //  It returns an static object, don't be afraid
      'get_user_permissions': [{
        role: 'none',
      }],
      'get_user_types': [{
        role: 'none'
      }],

      'search_nearest_dojos': [{
        role: 'none'
      }],

      'list_countries': [{
        role: 'none'
      }],
      'list_places': [{
        role: 'none'
      }],
      //  Not even used
      'countries_lat_long': [{
        role: 'none'
      }],
      'continent_codes': [{
        role: 'none'
      }],
      'poll_count': [{
        role: 'none'
      }],
      // It's by design, but we know it's insecure as it could allow to vote as as another dojo
      'save_poll_result': [{
        role: 'none'
      }],
      'get_poll_setup': [{
        role: 'none'
      }],
      'get-poll-results': [{
        role: 'none'
      }],
      'send_test_email_poll': [{
       role: 'cdf-admin'
      }],
      'start_poll': [{
       role: 'cdf-admin'
     }],
     'queue_email_poll': [{
      role: 'cdf-admin'
     }]
    }
  };
};
