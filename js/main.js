class Blood{
    constructor(){
        this.data = {};
        this.form = document.getElementById('form');
        this.form_inputs = document.getElementById('measure-inputs');
        this.results = document.getElementById('measure-inputs');
        this.results_details = document.getElementById('measure-results-details');
        this.age = document.getElementById("personal_age");
        this.age_step = document.getElementById("age-step");
        this.gender = document.getElementById("gender");
        this.score = document.getElementById("result-score");
        this.score_title = document.getElementById("result-score-title");
        this.form_data = {};
        // fetching json data to this.data variable
        fetch('/data/measures.json')
            .then(res => res.json())
            .then(data => this.data = data)
            .then(() => this.init()); 
            
    }
    init(){
        this.buildForm();
    }
    buildForm(){
        for (const measure of Object.keys(this.data)) {
            let item = this.data[measure];
            this.form_inputs.innerHTML += '\
                <div class="measures__block">\
                    <div class="measures__form">\
                        <div class="measures__title">'+item.Name+'<abbrev class="measures__abbrev"> ('+measure+')</abbrev></div>\
                        <div class="measures__value">\
                            <input id="'+measure+'-value" type="text" class="measures__input" placeholder="'+item.Placeholder+'">\
                            <div class="measures__step">'+item.Units+'</div>\
                        </div>\
                    </div>\
                </div>';
            }   
            let app = this;
            document.getElementById('calculate').addEventListener('click',this.collectData.bind(this))
    }
    buildResult(){
        this.results_details.innerHTML ="";
         // Calculating total score
         let total_score = this.calcTotalScore();
         this.score.innerHTML = total_score.score;
         this.score_title.innerHTML = total_score.title;
         this.score.className = "total-score__radial total-score__radial" +total_score.class;
         this.score_title.className = "total-score__conclusion total-score__conclusion" +total_score.class;
         
         document.getElementById('measure-results').classList.remove('hidden');

        for (const measure of Object.keys(this.data)) {
            let data = this.data[measure];
            let form_data = this.form_data[measure];
            let item_template = ""

           
            
            // Building percentage item
            let result_percentage = 0;
            let result_class = "";
            if (this.form_data[measure].DeviationFlag && !this.form_data[measure].Empty){
                item_template = "_need-atention";
                result_percentage = this.form_data[measure].DeviationPercentage+"%";
                result_class = "result-detail__value"+item_template;
                if (Math.abs(this.form_data[measure].DeviationPercentage) > 20){
                    item_template = "_poor";
                    result_class = "result-detail__value"+item_template;
                } else if (Math.abs(this.form_data[measure].DeviationPercentage) == 0){
                    item_template = "_na";
                    result_class = "result-detail__value"+item_template;
                    result_percentage = "Не в норме"
                }
            } else if(this.form_data[measure].Empty){
                    item_template = "_na";
                    result_class = "result-detail__value"+item_template;
                    result_percentage = "Нет данных"
            } else {
                result_percentage = "В норме"
            }
            // Building reason list
           
            let ReasonsHide = "hidden";
            let ReasonsHeader = "";
            let ReasonsData = [];
            let ReasonsList = "";
            let DontHideReasons = false;
            if (this.form_data[measure].DeviationFlag && !this.form_data[measure].Empty){

                if (this.form_data[measure].DeviationDirection == "too high") ReasonsData = this.data[measure].ReasonsHigh;
                if (this.form_data[measure].DeviationDirection == "too low") ReasonsData = this.data[measure].ReasonsLow;
                DontHideReasons = (item_template != "") ? true : false ;
                if (DontHideReasons && ReasonsData != null) ReasonsHide = '';
            }
            if(ReasonsData != null){
                if (DontHideReasons == false) ReasonsHeader = "reasons__header" + item_template;    
                for (let i = 0; i < ReasonsData.length; i++) {
                    let element = ReasonsData[i];
                    ReasonsList += '<li class="reasons__item">'+element+'</li>'
                }
            }

            // Building result item
            this.results_details.innerHTML += '\
            <div id="'+measure+'-detail" class="result-detail__item">\
                <div class="result-detail__line">\
                    <span class="result-detail__caption">'+data.Name+'</span>\
                    <span id="'+measure+'-detail-value" class="result-detail__value '+result_class+'">'+result_percentage+'</span>\
                </div>\
                <div class="result-detail__reasons reasons '+ReasonsHide+'">\
                    <h4 id="'+measure+'-reason-header" class="reasons__header '+ReasonsHeader+'">Возможные причины:</h4>\
                    <ul id="'+measure+'-reason-list" class="reasons__list">'+ReasonsList+'</ul>\
                </div>\
            </div>';
        }  
    }
    collectData(){
        this.form_data.Age = this.age.value * this.age_step.value;
        this.form_data.gender = this.getGender();
        this.form_data.fullfilled = true;
        for (const measure of Object.keys(this.data)) {
            let form_data_value = document.getElementById(measure+'-value').value;
            let form_data_value_empty = document.getElementById(measure+'-value').value == "";
            if (form_data_value_empty) this.form_data.fullfilled = false;
            let form_data_norm = this.getSpecificMeasureNorm(measure);
            let form_data_deviation = this.getDeviation(form_data_value, form_data_norm);

            this.form_data [measure] = { 
                "Value": form_data_value,
                "Empty": form_data_value_empty,
                "Norm": form_data_norm,
                "NormParsed": form_data_deviation.Range,
                "DeviationValue": form_data_deviation.Value,
                "DeviationPercentage": form_data_deviation.Percentage,
                "DeviationDirection": form_data_deviation.Direction,
                "DeviationFlag": form_data_deviation.Flag
            };
        }
        this.buildResult();
        location.href = "#";
        location.href = "#measure-results";
        return this.form_data;
    }
    getSpecificMeasureNorm(measure){
        if (Object.keys(this.form_data).length == 0) return console.warn("use app.collectData() before getting measure norms") || false;
        if (!(measure in this.data)) return console.warn("measure not exists") || false;

        let norma = this.data[measure]["Measures"];

        for (let index = 0; index < norma.length; index++) {
            let previous = (index > 0) ? norma[index-1] : {"Age": 0};
            let next = (index < norma.length) ? norma[index+1] : {"Age": 0};
            let current = norma[index];
            
            if (current.CheckAge == "ThisAndLower"){
                if (this.form_data.Age <= current.Age) return this.getMeasureRange(current)
            } else if(current.CheckAge == "FromLastToThis"){
                if (this.form_data.Age <= current.Age && this.form_data.Age > previous.Age) return this.getMeasureRange(current);
            } else if(current.CheckAge == "FromLastToThisAndGreater"){
                if (this.form_data.Age >= current.Age && this.form_data.Age > previous.Age) return this.getMeasureRange(current);
            } else if(current.CheckAge == "ThisAndGreater"){
                if (this.form_data.Age >= current.Age) return this.getMeasureRange(current);
            } else if(current.CheckAge == "SameToAll"){
                return this.getMeasureRange(current);
            }
        }
    }
    getMeasureRange(obj){
        if (obj[this.form_data.gender] == null ) return obj['Base']
        return obj[this.form_data.gender];
    }
    getDeviation(value, norm){
        let range = this.parseRange(norm);
        if (!this.proofRange(range)) return console.log('getDeviation should recieve range of numbers divided by \'|\', e.g. 1.0|3.0') || false;
        let deviation_value = 0 ;
        let deviation_percentage = 0;
        let deviation_direction = '';
        let deviation_flag = false;

        if (value < range[0]){
            deviation_value = value - range[0];
            deviation_direction = 'too low';
            deviation_flag = true;
            if (range[0] == 0 || value == 0) {
                deviation_percentage = 0
            } else {
                deviation_percentage = Math.ceil(((range[0]/value)-1)*100*100)/100;
            }
        } else if (value > range[1]){
            deviation_value = value - range[1];
            deviation_direction = 'too high';
            deviation_flag = true;
            if (range[1] == 0 || value == 0) {
                deviation_percentage = 0
            } else {
                deviation_percentage = Math.ceil(((range[1]/value)-1)*100*100)/100;
            }
        }

        return {
            "Value" : Math.ceil(deviation_value*100)/100,
            "Percentage" : deviation_percentage,
            "Direction": deviation_direction,
            "Flag": deviation_flag,
            "Range":range
        }
    }
    getGender(){
        return this.gender.querySelector("input:checked").value;
    }
    proofRange(range){
        return typeof(range[0]) == 'number' || typeof(range[1]) == 'number'
    }
    parseRange(str){
        return str.split('|').map(Number);
    }
    calcTotalScore(){
        let deviant = 0;
        let cool = 0;
        let score = 0;
        let title = "";
        let result_type = "";
        let emptyFlag = false;
        for (const measure of Object.keys(this.data)) {
            
            if (!this.form_data[measure].Empty || this.form_data.fullfilled){
                if (this.form_data[measure].DeviationFlag) 
                    deviant++
                else
                    cool++
            } else {
                emptyFlag == true
            }
        }
        if(emptyFlag == false && cool > 0 && deviant > 0 && this.form_data.fullfilled){
            score = Math.floor(cool/deviant*100);
            console.log(cool,deviant);
        } else {
            score = "N/A";
        }
        
        if(emptyFlag == false){
            
            if (score < 60){
                title ="Обратитесь к врачу";
                result_type = "_poor"
            } else if (score < 90){
                title ="Стоит обратить внимание";
                result_type = "_need-attention"
            } else if(score > 90){
                title ="Все в порядке";
                result_type = "_good"
            } else if(score == "N/A"){
                title ="Недостаточно данных";
                result_type = "_na"
            } else {
                title ="Неверные или слишком низкие результаты";
                result_type = "_poor"
            }
        } else {
            title ="Недостаточно данных";
            result_type = "_na"
        }
        return {
            "score" : score,
            "title": title,
            "class": result_type
        }
    }
};
app = new Blood();