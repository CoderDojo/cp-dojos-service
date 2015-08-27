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
        required:false,
        infoIcon:true,
        infoText:'This is not required but will help you significantly with the running of your Dojo! It is encouraged to encourage parents to get involved in the running of your Dojo!'
      },
      {
        title:'Background check',
        name:'backgroundCheck',
        required:false,
        textField:true,
        placeholder:'Please describe how you have background checked your team',
        infoIcon:true,
        infoText:'This is specific to the legislation in your jurisdiction. Please comment below giving us more information or contact a CoderDojo Foundation staff member at <a href=\'mailto:info@coderdojo.com\'>info@coderdojo.com</a>',
        taoIcon:true
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
        title:'Ensure health and safety best practices are met',
        name:'ensureHealthAndSafety',
        required:false,
        textField:true,
        placeholder:'Please add a comment on how you\'ve met local health and safety best practices in your region',
        taoIcon:true
      },
      {
        title:'Ensure public liability insurance is covered',
        name:'ensureInsuranceCover',
        required:false,
        textField:true,
        placeholder:'Please add a comment on how you\'ve met public liability best practices in your region',
        taoIcon:true
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
        required:false,
        infoIcon:true,
        infoText:'See <a href=\'http://kata.coderdojo.com/wiki/Learning_Resource\' target=\'_blank\'>Kata</a>, the CoderDojo community wiki for more information on learning resources'
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
        required:false,
        infoIcon:true,
        infoText:'This is not required but will help you significantly with the running of your Dojo and will help in connecting you to the global CoderDojo community!'
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
        title:'We will embody the CoderDojo ethos',
        name:'embodyCoderDojoTao',
        required:true,
        requiredMessage:'required.',
        infoIcon:true,
        infoText:'Please read CoderDojo ECHO, our guide to the Ethos, Culture, Happiness and Outcomes of CoderDojo <a href=\'http://kata.coderdojo.com/wiki/Guiding_Principles_and_Philosophies\' target=\'_blank\'>here</a>',
        taoIcon:true,
      },
      {
        title:'Online Safety: All mentors and young people are aware of online safety best practices and we only allow age appropriate content at our Dojo',
        name:'onlineSafetyBestPractice',
        textField:true,
        placeholder:'Please feel free to add comments or more information here',
        infoIcon:true,
        infoText:'Please see Online Safety 101 for Mentors <a href=\'https://docs.google.com/document/d/1DDwpYKBltkJXH15pr_p2Ig0_9l4Uq2TdE7zG_9QsdjI/edit?usp=sharing\' target=\'_blank\'>here</a> and Online Safety 101 for Ninjas <a href=\'https://docs.google.com/document/d/1BIhYjhOiTxeFdbBRVouBZQRWLQD_v-gCkCIYtDcP2CM/edit?usp=sharing\' target=\'_blank\'>here</a>',
        taoIcon:true
      },
      {
        title:'Data Protection: Our Dojo abides by data protection regulations in our jurisdiction',
        name:'dataProtectionRegulated',
        textField:true,
        placeholder:'Please feel free to add comments or more information here',
        infoIcon:true,
        infoText:'You can see more information on Data Protection <a href=\'https://docs.google.com/document/d/18XQNYEMQrBDJoR0Gt1ryC6CzxDEd_k41p4PEeKYtIxE/edit?usp=sharing\' target=\'_blank\'>here</a>',
        taoIcon:true
      },
      {
        title:'Diversity among our attendees is respected',
        name:'diversityRespected',
        textField:true,
        placeholder:'Please feel free to add comments or more information here',
        infoIcon:true,
        infoText:'You can see more information on our inclusion policy <a href=\'http://kata.coderdojo.com/wiki/Guiding_Principles_and_Philosophies#Inclusion_Policy\' target=\'_blank\'>here</a>',
        taoIcon:true
      },
      {
        title:'We will work to help engage with and improve the greater CoderDojo movement by',
        subList: true,
        subListItems: [ 'Communicating with the CoderDojo Foundation',
          'Contributing to Kata, the community knowledge base at kata.coderdojo.com',
          'Connecting with local and international Dojos to share insights and supports' ],
        name:'engageCoderDojoMovement',
        textField:true,
        placeholder:'Please feel free to add comments or more information here',
        infoIcon:true,
        infoText:'See more information on the supports available to you <a href=\'https://coderdojo.com/organise-a-dojo/community-support/\' target=\'_blank\'>here</a>',
        taoIcon:true
      }
    ]
  }
];