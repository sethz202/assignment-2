// Built-in Node.js modules
let fs = require('fs');
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');
const { runInNewContext } = require('vm');
const Plotly = require('plotly')('zerw2167', '3tI0qu2MF2IEHlqoCTwR');


let public_dir = path.join(__dirname, 'public');
let template_dir = path.join(__dirname, 'templates');
let db_filename = path.join(__dirname, '/db/baddrivers.sqlite3');

let app = express();
let port = 8000;

// Open SQLite3 database (in read-only mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
        console.log('getting query');
    }
});

// Serve static files from 'public' directory
app.use(express.static(public_dir));


// GET request handler for home page '/' (redirect to desired route)
app.get('/', (req, res) => {
    let home = '/home'; // <-- change this
    res.redirect(home);
});

app.get('/home', (req, res) => {
    fs.readFile('index.html', (err, page) => {
        res.status(200).type('html').send(page);
    });
});

app.get('/states', (req, res) => {
    fs.readFile('states.html', (err, page) => {
        res.status(200).type('html').send(page);
    });
});

app.get('/data', (req, res) => {
    fs.readFile('data.html', (err, page) => {
        res.status(200).type('html').send(page);
    });
});

app.get('/states/:region/:state_requested', (req, res) => {
    let region = req.params.region;
    let state = req.params.state_requested.charAt(0).toUpperCase()+req.params.state_requested.slice(1);
    if (region !== 'south' && region !== 'midwest' && region !== 'northeast' && region !== 'west' && region !== 'all') {
        fs.readFile(path.join(template_dir, '404_template.html'), (err, error_page) => {
            error_page = error_page.toString();
            error_page = error_page.replace('%%PAGE_INFO%%', `/states/${region}/${state}`);
            res.status(404).type('html').send(error_page); 
        });
    } else {
        fs.readFile(path.join(template_dir, 'state_template.html'), (err, template) => {
            let query = 'SELECT Drivers.State, \
                        Drivers.Speeding, Drivers.Alcohol, Drivers.Premiums, Drivers.Losses\
                        FROM Drivers WHERE Drivers.State = ?';
            if (state.includes('_')){
                let index = state.indexOf('_')+1;
                state = state.replace('_', ' '+ state.charAt(index).toUpperCase());
                state = state.replace(state.charAt(index+1), '');
            }else if (state === 'Dc'){
                state = 'District of Columbia';
            }
            let states_list = [];
            if(region === 'all') {
                states_list = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
            } else if (region === 'northeast') {
                states_list = ['Connecticut', 'Maine', 'Massachusetts', 'New Hampshire', 'New Jersey', 'New York', 'Pennsylvania', 'Rhode Island', 'Vermont'];
            } else if (region==='midwest') {
                states_list = ['Illinois', 'Indiana', 'Iowa', 'Kansas', 'Michigan', 'Minnesota', 'Missouri', 'Nebraska', 'North Dakota', 'Ohio', 'South Dakota', 'Wisconsin'];
            } else if (region==='south'){
                states_list = ['Alabama', 'Arkansas', 'District of Columbia', 'Delaware', 'Florida', 'Georgia', 'Kentucky', 'Louisiana', 'Maryland', 'Mississippi', 'North Carolina', 'Oklahoma', 'South Carolina', 'Tennessee', 'Texas', 'Virginia', 'West Virginia'];
            } else {
                states_list = ['Alaska', 'Arizona', 'California', 'Colorado', 'Hawaii', 'Idaho', 'Montana', 'Nevada', 'New Mexico', 'Oregon', 'Utah', 'Washington', 'Wyoming'];
            }
            let prev_state = '';
            let next_state = '';
            db.all(query,[state],(err, rows) => {
                if (rows.length == 0 || !states_list.includes(state)){
                    fs.readFile(path.join(template_dir, '404_template.html'), (err, error_page) => {
                        error_page = error_page.toString();
                        error_page = error_page.replace('%%PAGE_INFO%%', `/states/${region}/${state.toLowerCase()}`);
                        res.status(404).type('html').send(error_page);  
                    });
                } else {
                    state_index = states_list.indexOf(state);
                    if (state_index == 0) {
                        next_state = states_list[state_index+1];
                        prev_state = states_list[states_list.length-1];
                    } else if (state_index == states_list.length-1) {
                        prev_state = states_list[state_index-1];
                        next_state = states_list[0];
                    } else {
                        next_state = states_list[state_index+1];
                        prev_state = states_list[state_index-1];
                    }
                    let data ='';
                    for(let i =0;i<rows.length;i++){
                        data += `<tr><td>${rows[i].Speeding}</td><td>${rows[i].Alcohol}</td><td>${rows[i].Premiums}</td><td>${rows[i].Losses}</td></tr>`;
                    }
                    template = template.toString();
                    template = template.replace("%%STATE_INFO%%", data);
                    template = template.replaceAll('%%STATE_NAME%%', state);
                    let prev_link = '';
                    let next_link = '';
                    if(prev_state === 'District of Columbia') {
                        prev_link = 'dc';
                    } else if(prev_state.includes(' ')) {
                        prev_link = prev_state.replace(' ', '_');
                    } else {
                        prev_link = prev_state;
                    }
                    if(next_state === 'District of Columbia') {
                        next_link = 'dc';
                    } else if (next_state.includes(' ')) {
                        next_link = next_state.replace(' ', '_');
                    } else {
                        next_link = next_state;
                    }
                    let prev_button = `<a href="/states/${region}/${prev_link.toLowerCase()}" class="button">Go to ${prev_state}</a>`
                    let next_button = `<a href="/states/${region}/${next_link.toLowerCase()}" class="button">Go to ${next_state}</a>`
                    if(prev_state === '') {
                        template = template.replace('%%PREV_BUTTON%%','');
                    } else if(next_state ===''){
                        template = template.replace('%%NEXT_BUTTON%%', '');
                    }
                    template = template.replace('%%STATE_IMAGE%%', `/images/states/${req.params.state_requested}.png`)
                    template = template.replace('%%PREV_BUTTON%%', prev_button);
                    template = template.replace('%%NEXT_BUTTON%%', next_button);
                    res.status(200).type('html').send(template);
                }
            });
        }); 
    }
});

function buildGraph(type, data_info) {
    const labels = [ 'AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA',
    'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME',
    'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM',
    'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX',
    'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'];
    var data = [{
        x: labels, 
        y: data_info,
        type: 'bar'
    }];

    var graphOptions = {filename: 'basic-bar', fileopt: 'overwrite'};
    Plotly.plot(data, graphOptions, (err, msg) => {
        let link = msg.url;
    });
}

//GET request handler for data :data_requested will be "speeding" or "alcohol" or state
app.get('/data/:data_requested', (req, res) => {
    let requested_data = req.params.data_requested.charAt(0).toUpperCase()+req.params.data_requested.slice(1);
    if (requested_data !== 'Speeding' && requested_data !== 'Alcohol'){
        fs.readFile(path.join(template_dir, '404_template.html'), (err, error_page) => {
            error_page = error_page.toString();
            error_page = error_page.replace('%%PAGE_INFO%%', `/data/${req.params.data_requested}`);
            res.status(404).type('html').send(error_page);  
        });
    } else {
        fs.readFile(path.join(template_dir, 'template.html'), (err, template) => {
            let query = 'SELECT Drivers.State, Drivers.Speeding, Drivers.Alcohol FROM Drivers';
            db.all(query,[],(err, rows) => {
                let data = '';
                let table_reason = '';
                let chart_data = [];
                if(requested_data === 'Speeding') {
                    table_reason = 'Speeding';
                    for(let i =0;i<rows.length;i++){
                        data += `<tr><td>${rows[i].State}</td><td>${rows[i].Speeding}</td></tr>`;
                        chart_data.push(rows[i].Speeding);
                    }
                } else {
                    table_reason = 'Alcohol-Impaired'
                    for(let i =0;i<rows.length;i++){
                        data += `<tr><td>${rows[i].State}</td><td>${rows[i].Alcohol}</td></tr>`;
                        chart_data.push(rows[i].Alcohol);
                    }
                }
                template = template.toString();
                let image_reason = '';
                let image = '';
                let graph_source = '';
                if (requested_data === "Speeding") {
                    image_reason = "speed limit sign";
                    image = '/images/other/speeding.jpg';
                } else {
                    image_reason = "pint of beer";
                    image = '/images/other/alcohol.jpg';
                }
                buildGraph(requested_data, chart_data);
                template = template.replace('%%GRAPH_SOURCE%%', 'https://chart-studio.plotly.com/~zerw2167/0');
                template = template.replace('%%DATA_IMAGE%%', image);
                template = template.replace('%%PICTURE_REASON%%', image_reason);
                template = template.replaceAll('%%DATA_TYPE_LOWERCASE%%', requested_data.toLowerCase());
                template = template.replaceAll('%%DATA_TYPE%%', requested_data);
                template = template.replace('%%TABLE_REASON%%', table_reason);
                template = template.replace('%%DRIVERS_INFO%%', data);
                res.status(200).type('html').send(template);
            }); 
        });
    }
});

app.use((req, res) => {
    fs.readFile(path.join(template_dir, '404_template.html'), (err, error_page) => {
        error_page = error_page.toString();
        error_page = error_page.replace('%%PAGE_INFO%%', `${req.originalUrl}`);
        res.status(404).type('html').send(error_page);  
    });
});

// Start server
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
