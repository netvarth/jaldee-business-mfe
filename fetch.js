fetch("http://localhost:3000/api/v1/crm-lead-pipelines", {
  headers: { "Authorization": "Bearer YOUR_TOKEN_HERE" } // wait, I don't have token
}).then(res => res.json()).then(console.log);
