module.exports = [
  {
    title:'Gather Your Team',
    checkboxes:[
      {
        title:'Find Mentors *',
        name:'findMentors',
        required:true,
        placeholder:'Find technical mentors in your community to volunteer at your Dojo',
        requiredMessage:'You must find mentors to continue'
      },
      {
        title:'Find Volunteers',
        name:'findVolunteers',
        required:false,
        placeholder:'Find non technical volunteers to help support your Dojo Eg. parents etc.'
      },
      {
        title:'Background Check',
        name:'backgroundCheck',
        required:false,
        textField:true,
        placeholder:'Set up background checking for all volunteers. This is specific to the legislation in your jurisdiction. Please comment below giving us more information or contact a CoderDojo Foundation staff member at info@coderdojo.com.'
      }
    ]
  },
  {
    title:'Find a Venue',
    checkboxes:[
      {
        title:'Locate a suitable free venue in your community *',
        name:'findVenue',
        required:true,
        requiredMessage:'You must find a suitable venue to continue'
      },
      {
        title:'Ensure venue meets local health and safety best practices',
        name:'healthAndSafety',
        required:false,
        textField:true,
        placeholder:'Please provide more information'
      },
      {
        title:'Ensure appropriate public liability insurance for your venue',
        name:'insurance',
        required:false,
        textField:true,
        placeholder:'Please provide more information'
      },
    ]
  },
  {
    title:'Plan your Dojo',
    checkboxes:[
      {
        title:'Set launch date and regular time for your Dojo *',
        name:'planDojoDates',
        required:true,
        requiredMessage:'You must set the first date of your Dojo.'
      },
      {
        title:'Create a content plan with mentors',
        name:'planContent',
        required:false
      },
      {
        title:'Set up ticketing and registration for your Dojo',
        name:'ticketing',
        required:false
      }
    ]  
  },
  {
    title:'Promote',
    checkboxes:[
      {
        title:'Set up an email address specifically for your Dojo *',
        name:'socialMediaSetup',
        required:true,
        requiredMessage:'You must set up an email for your Dojo'
      },
      {
        title:'Set up a social media presence for your Dojo. eg. Facebook, Twitter',
        name:'socialMediaSetup',
        required:false
      },
      {
        title:'Connect with the global CoderDojo Community via CoderDojo Organisers Group <a href="https://groups.google.com/forum/#!forum/coderdojo-org">https://groups.google.com/forum/#!forum/coderdojo-org</a>',
        name:'connectWithCommunity',
        required:false
      },
    ]
  }
];