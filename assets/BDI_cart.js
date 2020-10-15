var BDI_CART = new function () {
    this.checkPamQuantity = function () {
        var can = PAM.can_checkout();
        if (!can.can_checkout) {
            show_message('Your Shopping Baskets includes a Pick and Mix bag containing ' + can.quantity + ' item' + (can.quantity > 1 ? 's' : '') + '. You must add at least ' + can.min + ' items per bag', function () { hide_all_popups(); });
            return false;
        }
        return true;
    }


    this.show_checkout_tempt_popup = function () {
        if (!this.checkPamQuantity())
            return;

        $('#popupBoxTemptAtCheckout').css({ 'display': 'block' });
        $('#popupBoxWrapper').css('display', 'none');


        $('#popup-mask').css('display', 'block');
        $(window).scrollTop(0);
    }

    this.doPamSubmit = function () {
        $('#popup-mask').css('display', 'none');
        $('#popupBoxTemptAtCheckout').css('display', 'none');
        PAM.submitCart();
        return false;
    }

    this.doPamSubmitFromCart = function () {
        if (!this.checkPamQuantity())
            return;
        this.doPamSubmit();
    }
}      
