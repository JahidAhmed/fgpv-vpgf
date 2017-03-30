class HelloDirective implements ng.IDirective {
    restrict = 'E';
    template = `Hello {{self.name}} {{self.delayed}}`;
    scope = false;

    link(scope : ng.IScope, elements : ng.IAugmentedJQuery, attrs : ng.IAttributes) {
        scope.self.name = 'World';
        this.timeout(() =>
            scope.self.delayed = 'delayed text',
        9000);
    }

    // Module directive expects a directive factory which creates the directive, we do so here
    static factory(): ng.IDirectiveFactory {
        const directiveFactory: ng.IDirectiveFactory = ($timeout : ng.ITimeoutService) => new HelloDirective($timeout);
        directiveFactory.$inject = ["$timeout"];
        return directiveFactory;
    }

    constructor(private timeout : ng.ITimeoutService) {}
}

angular
    .module('app')
    .directive('helloDirective', HelloDirective.factory());
