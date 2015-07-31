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
        title:'Connect with other Dojos on social media and CoderDojo discussion forums',
        name:'connectOtherDojos',
        required:false
      }
    ]
  },
  {
    title:'Embodying the Ethos',
    checkboxes:[
      {
        title:'We will work to embody the CoderDojo ethos',
        name:'embodyCoderDojoTao',
        required:true,
        requiredMessage:'required.'
      },
      {
        title:'All mentors and young people are aware of online safety best practices and we only allow age appropriate content at our Dojo',
        name:'onlineSafetyBestPractice',
        required:true,
        requiredMessage:'required.',
        textField:true,
        placeholder:'Optionally describe how this was achieved.'
      },
      {
        title:'Our Dojo abides by data protection regulations in our jurisdiction',
        name:'dataProtectionRegulated',
        required:true,
        requiredMessage:'required.',
        textField:true,
        placeholder:'Optionally describe how this was achieved.'
      },
      {
        title:'Diversity among our attendees is respected',
        name:'diversityRespected',
        required:true,
        requiredMessage:'required.',
        textField:true,
        placeholder:'Optionally describe how this was achieved.'
      },
      {
        title:'We will work to help engage with and improve the greater CoderDojo movement by',
        subList: true,
        subListItems: [ "Communicating with the CoderDojo Foundation",
          "Contributing to Kata, the community knowledge base at kata.coderdojo.com",
          "Connecting with local and international Dojos to share insights and supports" ],
        name:'engageCoderDojoMovement',
        required:true,
        requiredMessage:'required.',
        textField:true,
        placeholder:'Optionally describe how this was achieved.'
      }
    ]
  }
];