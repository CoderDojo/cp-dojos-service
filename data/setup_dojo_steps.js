module.exports = [
  {
    title:'Gather your Team',
    checkboxes:[
      {
        title:'Gather Team',
        name:'gatherTeam',
        required:true,
        requiredMessage:'You must gather a team before continuing.'
      },
      {
        title:'Find Mentors',
        name:'findMentors',
        required:true,
        requiredMessage:'You must find mentors before continuing.'
      },
      {
        title:'Background Check',
        name:'backgroundCheck',
        required:false,
        textField:true,
        placeholder:'Please describe how you have background checked your team.'
      }
    ]
  },
  {
    title:'Find your Venue',
    checkboxes:[
    ]
  },
  {
    title:'Plan your Dojo',
    checkboxes:[
      { 
        title:'Plan how frequently you will run your Dojo',
        name:'planDojoFrequency',
        required:true,
        requiredMessage:'You must plan how often your Dojo will take place.',
        textField:true,
        placeholder:'Please describe when your Dojo will take place.'
      },
      {
        title:'Set the first date of your Dojo',
        name:'planDojoFirstDate',
        required:true,
        requiredMessage:'You must set the first date of your Dojo.'
      },
      {
        title:'Set up Social Media',
        name:'socialMediaSetup',
        required:false
      },
      {
        title:'Set up Website',
        name:'websiteSetup',
        required:false
      },
      {
        title:'Plan the content you will use',
        name:'planContent',
        required:false
      }
    ]  
  },
  {
    title:'Promote',
    checkboxes:[
    ]
  }
];