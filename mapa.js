const DIR_MODELOS_LSTM_URL = './ModelosLSTM'
const DIR_MUESTRAS_LSTM_URL = './MuestrasLSTM'
const DIR_MODELOS_MLP_URL = './ModelosMLP'
const DIR_MUESTRAS_MLP_URL = './MuestrasMLP'
const PTO_MEDIDA_URL = 'pmed_ubicacion.kml'
//Falta generar un kml unicamente con los ptos de medida que tengan modelo

let modeloLSTM = []
let sampleLSTM = []
let previsionLSTM = []
let modeloMLP = []
let sampleMLP = []
let previsionMLP = []
let map
let vectorSource
let coloreando = false

let slider = document.getElementById("slider")

initMap()

async function initMap(){
    try {
        console.log("Inicializacion mapa")
        let raster = new ol.layer.Tile({
            source: new ol.source.OSM()
        })

        vectorSource = new ol.source.Vector({
            url: PTO_MEDIDA_URL,
            format: new ol.format.KML()
        })
        let vector = new ol.layer.Vector({
            source: vectorSource
        })

        map = new ol.Map({
            target: 'map',
            layers: [raster, vector],
            view: new ol.View({
                center: ol.proj.fromLonLat([-3.69061287867823, 40.4078905050551]),
                zoom: 18
            })
        })

        //vectorSource.on('change', coloreaMarcas)
        console.log("Inicializacion mapa finalizada")
        
    } catch (err) {
        console.log('Error inicializacion mapa: ', err)
    }
}

function radButClick(){
    coloreaMarcas()
}

function coloreaMarcas(){
    if (vectorSource.getState() == 'ready' && ! coloreando ){
        coloreando = true    // FIXME es util?
        let extent = map.getView().calculateExtent(map.getSize())
        vectorSource.forEachFeatureInExtent(extent, coloreaUnaMarca)
        coloreando = false
    }
}

function coloreaUnaMarca(feature){
    cargaDatosPrevision(feature).then(
        cargaModelo(feature).then(
            function(feature){                
                let id = parseInt(feature.get('id'))
                console.log("Promesa cargaModelo", id)
                lanzaPrevision(feature)
            }
        )
    )
    console.log('coloreaUnaMarca Fin: ', parseInt(feature.get('id')) )
}

async function cargaDatosPrevision(feature){
    try {
        let id = parseInt(feature.get('id'))
        let tipoModelo = document.querySelector('input[name="modelo"]:checked').value
        let url
        
        switch (tipoModelo) {
            case 'LSTM':
                if (typeof sampleLSTM[id] !== 'undefined') {
                    return feature
                }
                url= DIR_MUESTRAS_LSTM_URL + '/' + id + '.json'
                console.log("Pidiendo ", id, " ", url)
                sampleLSTM[id] = await (await fetch(url)).json()
                return feature

            case 'MLP':
                if (typeof sampleMLP[id] !== 'undefined') {
                    return feature
                }
                url= DIR_MUESTRAS_MLP_URL + '/' + id + '.json'
                console.log("Pidiendo ", id, " ", url)
                sampleMLP[id] = await (await fetch(url)).json()
                return feature
        }
    } catch (err) {
        console.log('Error solicitando muestras del pto Medida:', err)
    }
}

async function cargaModelo(feature){
    try {
        let id = parseInt(feature.get('id'))
        let tipoModelo = document.querySelector('input[name="modelo"]:checked').value
        let url
        
        switch (tipoModelo) {
            case 'LSTM':
                if (typeof modeloLSTM[id] !== 'undefined') {
                    return feature
                }
                url = DIR_MODELOS_LSTM_URL + '/' + id + '/' + 'model.json'
                console.log("Pidiendo ", id, " ", url)
                modeloLSTM[id] = await tf.loadLayersModel(url)
                return feature
                
            case 'MLP':
                if (typeof modeloMLP[id] !== 'undefined') {
                    return feature
                }
                url = DIR_MODELOS_MLP_URL + '/' + id + '/' + 'model.json'
                console.log("Pidiendo ", id, " ", url)
                modeloMLP[id] = await tf.loadLayersModel(url)
                return feature
        }
    } catch (err) {
        console.log('Error solicitando modelo de pto Medida:', err)
    }
}

async function lanzaPrevision(feature){
    try {
        let id = parseInt(feature.get('id'))
        let tipoModelo = document.querySelector('input[name="modelo"]:checked').value
        let i = indiceFecha()
        let m, p, s

        console.log ('lanzaPrevision Incio', tipoModelo, id)

        switch (tipoModelo) {
            case 'LSTM':
                m = modeloLSTM[id]
                p = previsionLSTM[id]
                s = sampleLSTM[id]
                break
            case 'MLP':
                m = modeloMLP[id]
                p = previsionMLP[id]
                s = sampleMLP[id]
        }
        
        if (typeof p !== 'undefined') {
            console.log('lanzaPrevision', tipoModelo, 'Fin', id, 'prevision[',i,']:', p[i])
            asignaColor(feature, p[i])
            return
        }
        
        console.log ('lanzaPrevision mitad', tipoModelo, id)
        
        //let t = tf.tensor3d(s.data) //FIXME tf.tidy tf.dispose
        let t = tf.tensor(s.data) //FIXME tf.tidy tf.dispose
        m.predict(t).data().then( function (v) {
            let i = indiceFecha()
            //let tipoModelo = document.querySelector('input[name="modelo"]:checked').value
            
            console.log('calcula Modelo', tipoModelo, id)
            switch (tipoModelo) {
                case 'LSTM':
                    previsionLSTM[id] = minMaxInverseScaler(v, sampleLSTM[id].scalerMin, sampleLSTM[id].scalerMax )
                    asignaColor(feature, previsionLSTM[id][i])
                    console.log('calcula Modelo', tipoModelo, 'Fin', id, 'prevision[',i,']:', previsionLSTM[id][i])
                    break
                case 'MLP':
                    previsionMLP[id] = minMaxInverseScaler(v, sampleMLP[id].scalerMin, sampleMLP[id].scalerMax )
                    asignaColor(feature, previsionMLP[id][i])
                    console.log('calcula Modelo', tipoModelo, 'Fin', id, 'prevision[',i,']:', previsionMLP[id][i])
            }
            console.log('calcula Modelo Fin', tipoModelo, id)
        })
        console.log ('lanzaPrevision Fin', tipoModelo, id)
    } catch (err) {
        console.log('Error lanzando prevision:', err)
    }
}

function indiceFecha () {
    return (slider.value - slider.min ) / slider.step
}

function minMaxInverseScaler (data, min, max) {

    let scaledData = data.map(function (value) {
        return value * (max - min) + min
    })
    return scaledData
}

function asignaColor(feature, intensidad){
    let color

    if (intensidad < 100){
        color = 'LawnGreen'
    } else if (intensidad < 500){
        color = 'lime'
    } else if (intensidad < 1000){
        color = 'LimeGreen'
    } else if (intensidad < 2000){
        color = 'Green'
    } else if (intensidad < 3000){
        color = 'yellow'
    } else if (intensidad < 5000){
        color = 'Orange'
    } else {//if (intensidad < 10000){
        color = 'red'
    }

    let style = new ol.style.Style({
        fill: new ol.style.Fill({ color: color })
    })
    feature.setStyle(style)
}
