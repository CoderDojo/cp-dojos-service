module.exports = [
  {
    title:'Gather your Team',
    checkboxes:[
      {
        title:'Find technical mentors in your community to volunteer at your Dojo.',
        name:'findTechnicalMentors',
        required:true,
        requiredMessage:'This is required for you to create a Dojo listing!',
        infoIcon:true,
        infoText:'We recommend a ratio of 1:8 mentors to youths, e.g. for an average Dojo of 24 youth, 3 technical mentors would be suggested. Recruit as many mentors as not all volunteers will be able to make all sessions. If you are having difficulty finding mentors get in touch with local businesses, universities and parent groups.'
      },
      {
        title:'Find non-technical mentors. E.g. parents etc.',
        name:'findNonTechnicalMentors',
        required:false,
        infoIcon:true,
        infoText:'This is not required but will help you significantly with the running of your Dojo! We recommend encouraging parents to get involved in the running of your Dojo.  This could include managing social media accounts, overseeing ticketing for the Dojo, recruiting mentors, local outreach etc.'
      },
      {
        title:'Set up background checking for all volunteers.',
        name:'backgroundCheck',
        required:false,
        textField:true,
        placeholder:'Please describe the situation in your Dojo and if your team has been background checked.',
        infoIcon:true,
        infoText:'The requirements for background checking are specific to the legislation in your jurisdiction. You can see some guidelines on Child Protection and Background Checking on <a href="http://kata.coderdojo.com/wiki/Child_Protection_and_Background_Checking">Kata</a>. Please also ensure you check your local legislation. Please comment below describing the situation in your local Dojo.',
        taoIcon:true
      }
    ]
  },
  {
    title:'Find a Venue',
    checkboxes:[
      {
        title:'Locate a suitable free venue in your community.',
        name:'locateVenue',
        required:true,
        requiredMessage:'This is required for you to create a Dojo listing!',
        infoIcon:true,
        infoText:'A suitable venue has tables, chairs, heat and ideally, wifi! Canteens, community centers, libraries, schools and corporate offices all make great venues. Venues should not replicate a teacher led classroom environment, instead rearrange the desks and chairs, put youths together and ensure there is space for mentors to walk around and assist the young people. Dojos should only be hosted in public spaces, you cannot host your Dojo in a private residence!'
      },
      {
        title:'Ensure your venue is aware of local health and safety best practices.',
        name:'ensureHealthAndSafety',
        required:false,
        textField:true,
        placeholder:'Please add a comment on how you\'ve met local health and safety best practices in your region',
        infoIcon:true,
        infoText:'The main points to be aware of in a Dojo setting is extension cables! Make sure these are strapped to the floor and don’t cover pathways.',
        taoIcon:true
      },
      {
        title:'Ensure appropriate public liability insurance for your venue.',
        name:'ensureInsuranceCover',
        required:false,
        textField:true,
        placeholder:'Please add a comment to let us know the situation with public liability in your Dojo.',
        infoIcon:true,
        infoText:'If your Dojo takes place in a corporate office, school or library it is likely that the existing public liability insurance covers the Dojo. Make sure you check this with the venue host in advance of your first session. If it doesn’t, ask the venue to sponsor the cost of adding it to their policy.',
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
        requiredMessage:'This is required for you to create a Dojo listing!',
        infoIcon:true,
        infoText:'If you build it they will come! Pick a date for your first Dojo session and start working towards it. Dojos can run weekly, bi-weekly or monthly. They can be run on weekdays or weekends it all depends on what suits your community.'
      },
      {
        title:'Create a plan for what content you would like to cover with your mentors.',
        name:'planContent',
        required:false,
        infoIcon:true,
        infoText:'Many Dojos start with Scratch or dive straight into HTML. See Kata, the CoderDojo community wiki for <a href="http://kata.coderdojo.com/wiki/Learning_Resource">more information on learning resources.</a>'
      },
      {
        title:'Setup ticketing and registration for your Dojo',
        name:'setupTicketingAndRegistration',
        required:false,
        infoIcon:true,
        infoText:'Ticketing can be done right here in the community platform!'
      }      
    ]  
  },
  {
    title:'Promote your Dojo',
    checkboxes:[
      {
        title:'Set up an email address specifically for your Dojo',
        name:'setDojoEmailAddress',
        required:true,
        requiredMessage:'You must set an email address for your Dojo.',
        infoIcon:true,
        infoText:'This is important as it will allow multiple people to assist in overseeing the email account.  You can set up a gmail or standard free to use email address for your Dojo (for example docklandsdojo@gmail.com or we can issue you a coderdojo.com email when you are creating a listing on the next stage e.g. docklands.ie@coderdojo.com).'
      },
      {
        title:'Set up social media presence for your Dojo. e.g. Facebook, Twitter',
        name:'setupSocialMedia',
        required:false,
        infoIcon:true,
        infoText:'This is not required but will help you significantly with the running of your Dojo and will help in connecting you to the global CoderDojo community!'
      },
       {
        title:"Learn how to connect with other Dojos on social media and the <a href=\"https://forums.coderdojo.com\">CoderDojo discussion forums</a>",
        name:'connectOtherDojos',
        required:false
      }
    ]
  },
  {
    title:'Embodying the Ethos',
    checkboxes:[
      {
        title:'Embody the CoderDojo ethos.',
        name:'embodyCoderDojoTao',
        required:true,
        requiredMessage:'This is required for you to create a Dojo listing!',
        infoIcon:true,
        infoText:'Please read CoderDojo ECHO and share it with your mentors. This is the guide to the Ethos, Culture, Happiness and Outcomes of CoderDojo <a href="http://kata.coderdojo.com/wiki/Guiding_Principles_and_Philosophies">here</a>',
        taoIcon:true,
      },
      {
        title:'Online Safety: Ensure all mentors have read the Online Safety 101 document. and young people are aware of online safety best practices and we only allow age appropriate content at our Dojo',
        name:'onlineSafetyBestPractice',
        textField:true,
        placeholder:'Please feel free to add comments or more information here',
        infoIcon:true,
        infoText:'Please see Online Safety 101 for Mentors <a href=\'https://docs.google.com/document/d/1DDwpYKBltkJXH15pr_p2Ig0_9l4Uq2TdE7zG_9QsdjI/edit?usp=sharing\' target=\'_blank\'>here</a> and Online Safety 101 for Ninjas <a href=\'https://docs.google.com/document/d/1BIhYjhOiTxeFdbBRVouBZQRWLQD_v-gCkCIYtDcP2CM/edit?usp=sharing\' target=\'_blank\'>here</a>',
        taoIcon:true
      },
      {
        title:'Data Protection: Our Dojo only uses data provided for the intended purpose. abides by data protection regulations in our jurisdiction.',
        name:'dataProtectionRegulated',
        textField:true,
        placeholder:'Please feel free to add comments or more information here',
        infoIcon:true,
        infoText:'Data protection is increasingly becoming an important topic, <a href="http://kata.coderdojo.com/wiki/Data_Protection_101">here are some simple tips to make sure you stay informed</a>.',
        taoIcon:true
      },
      {
        title:'Diversity among our attendees is respected',
        name:'diversityRespected',
        textField:true,
        placeholder:'Please feel free to add comments or more information here',
        infoIcon:true,
        infoText:'Inclusion is a fundamental principle of CoderDojo, <a href="http://kata.coderdojo.com/wiki/Guiding_Principles_and_Philosophies#Inclusion_Statement">read our short inclusion statement and confirm you and your mentors are in agreement.</a>',
        taoIcon:true
      },
      {
        title:'Our Dojo will work to engage with and improve the greater CoderDojo movement by:',
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