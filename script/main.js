import Widget from './widget.js'
import { default as WidgetBeta } from './widget.beta.js'

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const beta = urlParams.get('beta');

    if (beta !== '1') {
        new Widget();
    } else {
        document.title = document.title + " (beta)";
        new WidgetBeta(true)
    }
    
}