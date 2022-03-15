describe('Bracket', () => {
  it('shows bracket coming soon message', () => {
    cy.clock(Date.UTC(2050, 2, 1), ['Date']);

    cy.visit('/#2050');
    cy.get('h3').should('contain.text', 'The 2050 bracket arrives in');
  });

  it('updates the location hash when changing the year', () => {
    cy.visit('/');
    cy.get('#year-picker').select('2019');
    cy.location().its('hash').should('eq', '#2019');
  });

  it('renders a bracket in desktop mode', () => {
    cy.visit('/#2019');

    cy.eyesOpen({
      appName: 'Circle Bracket',
      testName: 'render bracket'
    });

    cy.get('.canvas-wrap').should('not.have.class', 'loading');

    cy.eyesCheckWindow({
      tag: "2019 Bracket",
      target: 'window',
      fully: true
    });

    cy.eyesClose();
  });
});
