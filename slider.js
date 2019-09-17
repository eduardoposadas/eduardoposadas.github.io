initSlider()

async function initSlider(){
    // Variable global
    // let slider = document.getElementById("slider")
    let output = document.getElementById("pie")

    let conf= await (await fetch('./configuracion.json')).json()
    let min = conf['fechaInicio']
    let max = min + (conf['periodicidad'] * (conf['numeroMuestras'] - 1) )

    slider.setAttribute("step", conf['periodicidad'] )
    slider.setAttribute("min", min)
    slider.setAttribute("max", max)

    output.innerHTML = convertUnixTime( slider.value )

    slider.onchange = function() {
        output.innerHTML = convertUnixTime( slider.value )
        coloreaMarcas()
    }
}

function convertUnixTime(unixtime){
    let meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

    let date = new Date(unixtime*1000)
    let anio = date.getUTCFullYear()
    let mes = meses[ date.getUTCMonth() ]
    let dia = date.getUTCDate()
    let hora = date.getUTCHours()
    let min = "0" + date.getUTCMinutes()
    let seg = "0" + date.getUTCSeconds()

    return dia+'-'+mes+'-'+anio+' '+hora+':'+min.substr(-2)+':'+seg.substr(-2)
}
