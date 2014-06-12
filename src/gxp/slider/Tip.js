Ext.define('gxp.slider.Tip', {
    extend: 'Ext.slider.Tip',
    hover: true,
    dragging: false,
    init: function(slider) {
        if(this.hover) {
            slider.on("render", this.registerThumbListeners, this);
        }
        this.slider = slider;
        this.callParent(arguments);
    },
    registerThumbListeners: function() {
        for(var i=0, len=this.slider.thumbs.length; i<len; ++i) {
            this.slider.thumbs[i].el.on({
                "mouseover": this.createHoverListener(i),
                "mouseout": function() {
                    if(!this.dragging) {
                        this.hide.apply(this, arguments);
                    }
                },
                scope: this
            });
        }
    },
    createHoverListener: function(index) {
        return Ext.bind(function() {
            this.onSlide(this.slider, {}, this.slider.thumbs[index]);
            this.dragging = false;
        }, this);
    },
    onSlide: function(slider, e, thumb) {
        this.dragging = true;
        this.callParent(arguments);
    }
});
