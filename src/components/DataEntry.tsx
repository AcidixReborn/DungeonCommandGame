import { Container, Row, Col, Card, Tabs, Tab } from 'react-bootstrap'

function DataEntry() {
  return (
    <Container fluid>
      <Row>
        <Col>
          <Card bg="dark" text="white">
            <Card.Header>Data Entry - Card Management</Card.Header>
            <Card.Body>
              <Tabs defaultActiveKey="creatures" className="mb-3">
                <Tab eventKey="creatures" title="Creatures">
                  <p>Creature card entry form will go here.</p>
                  <p>You'll be able to input creature stats, abilities, and upload images.</p>
                </Tab>
                <Tab eventKey="orders" title="Order Cards">
                  <p>Order card entry form will go here.</p>
                  <p>
                    You'll be able to input order card effects, abilities required, and action
                    types.
                  </p>
                </Tab>
                <Tab eventKey="commanders" title="Commanders">
                  <p>Commander card entry form will go here.</p>
                  <p>You'll be able to input commander stats and special abilities.</p>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default DataEntry
