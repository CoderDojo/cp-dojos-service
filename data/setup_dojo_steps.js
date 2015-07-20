module.exports = [
  {
    title:'Gather your Team',
    checkboxes:[
      {
        title:'Find technical mentors',
        name:'findTechnicalMentors',
        required:true,
        requiredMessage:'You must find technical mentors before continuing.'
      },
      {
        title:'Find non-technical mentors',
        name:'findNonTechnicalMentors',
        required:false
      },
      {
        title:'Background check',
        name:'backgroundCheck',
        required:false,
        textField:true,
        placeholder:'Please describe how you have background checked your team.'
      }
    ]
  },
  {
    title:'Find a Venue',
    checkboxes:[
      {
        title:'Locate suitable venue within your community',
        name:'locateVenue',
        required:true,
        requiredMessage:'You must locate a suitable venue before continuing.'
      },
      {
        title:'Ensure health and saftey best practices are met',
        name:'ensureHealthAndSafety',
        required:false,
        textField:true,
        placeholder:'Please describe how you have ensured health and safety best practices.'
      },
      {
        title:'Ensure public liability insurance is covered',
        name:'ensureInsuranceCover',
        required:false,
        textField:true,
        placeholder:'Please describe how you have ensured public liability is covered'
      }
    ]
  },
  {
    title:'Plan your Dojo',
    checkboxes:[
      { 
        title:'Set launch date and regular time for your Dojo',
        name:'setDojoDateAndTime',
        required:true,
        requiredMessage:'You must set a Date and time for your Dojo to take place.'
      },
      {
        title:'Create a content plan with your mentors',
        name:'planContent',
        required:false
      },
      {
        title:'Setup ticketing and registration for your Dojo',
        name:'setupTicketingAndRegistration',
        required:false
      }      
    ]  
  },
  {
    title:'Promote your Dojo',
    checkboxes:[
      {
        title:'Set an email address specifically for your Dojo',
        name:'setDojoEmailAddress',
        required:true,
        requiredMessage:'You must set an email address for your Dojo.'
      },
      {
        title:'Set up social media presence for your Dojo',
        name:'setupSocialMedia',
        required:false
      },
       {
        title:'Connect with other Dojos on sovial media and CoderDojo discussian forums',
        name:'connectOtherDojos',
        required:false
      }
    ]
  }
];