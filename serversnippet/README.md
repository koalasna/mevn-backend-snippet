# webproject

## Portfoliopohja

Projektissa kehitettiin nettisivut, joille on myös toimivat admin-sivut. 
Tässä repossa esittelen kehittämäni backendin. 
configuration -kansion olen jättänyt pois.

### Nettisivun url
 https://shrouded-gorge-69388.herokuapp.com/

### Adminsivun url
 https://shrouded-gorge-69388.herokuapp.com/?edit=true


### API

| URL        | Get           | Post  | Put | Delete |
| ------------: | -------------:| -----:| -----:| -----:|
| https://shrouded-gorge-69388.herokuapp.com/api/projects    | Get all projects | Add a new project | / | / |
| https://shrouded-gorge-69388.herokuapp.com/api/projects/ + project id| Get project by id| / | Edit a specific project | Delete project by id |
| https://shrouded-gorge-69388.herokuapp.com/api/files | Get all files/photos of all projects | / | / | / |
| https://shrouded-gorge-69388.herokuapp.com/api/files/ + file id | Watch / zoom in into picture | / | / | / |
| https://shrouded-gorge-69388.herokuapp.com/api/files/ + file id + /details | Get a specific picture's details | / | / | / |
