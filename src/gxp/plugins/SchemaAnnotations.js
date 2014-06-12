Ext.namespace("gxp.plugins");

gxp.plugins.SchemaAnnotations = {
    getAnnotationsFromSchema: function(r) {
        var result = null;
        var annotation = r.get('annotation');
        if (annotation !== undefined) {
            result = {};
            var lang = GeoExt.Lang.locale.split("-").shift();
            var i, ii;
            for (i=0, ii=annotation.appinfo.length; i<ii; ++i) {
                var json = Ext.decode(annotation.appinfo[i]);
                if (json.title && json.title[lang]) {
                    result.label = json.title[lang];
                    break;
                }
            }
            for (i=0, ii=annotation.documentation.length; i<ii; ++i) {
                if (annotation.documentation[i].lang === lang) {
                    result.helpText = annotation.documentation[i].textContent;
                    break;
                }
            }
        }
        return result;
    }
};
