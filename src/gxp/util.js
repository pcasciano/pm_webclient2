Ext.namespace("gxp");

gxp.util = {
    _uniqueNames: {},
    uniqueName: function(name, delimiter) {
        delimiter = delimiter || " ";
        var regEx = new RegExp(delimiter + "[0-9]*$");
        var key = name.replace(regEx, "");
        var regExResult = regEx.exec(name);
        var count = this._uniqueNames[key] !== undefined ?
            this._uniqueNames[key] :
            (regExResult instanceof Array ? Number(regExResult[0]) : undefined);
        var newName = key;
        if(count !== undefined) {
            count++;
            newName += delimiter + count;
        }
        this._uniqueNames[key] = count || 0;
        return newName;
    },
    dispatch: function(functions, complete, scope) {
        complete = complete || Ext.emptyFn;
        scope = scope || this;
        var requests = functions.length;
        var responses = 0;
        var storage = {};
        function respond() {
            ++responses;
            if(responses === requests) {
                complete.call(scope, storage);
            }
        }
        function trigger(index) {
            window.setTimeout(function() {
                functions[index].apply(scope, [respond, storage]);
            });
        }
        for(var i=0; i<requests; ++i) {
            trigger(i);
        }
    },
    getAbsoluteUrl: function(url) {
        var a;
        if(Ext.isIE6 || Ext.isIE7 || Ext.isIE8) {
            a = document.createElement("<a href='" + url + "'/>");
            a.style.display = "none";
            document.body.appendChild(a);
            a.href = a.href;
            document.body.removeChild(a);
        } else {
            a = document.createElement("a");
            a.href = url;
        }
        return a.href;
    }
};
