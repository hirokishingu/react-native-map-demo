import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { MapView } from 'expo';
import {
  point
} from '@turf/helpers'
import destination from '@turf/destination'
import { createStackNavigator } from "react-navigation";

const TagItem = (props) => {
  const { tag } = props
  return (
    <View style={styles.tagItem}>
      <View style={styles.tag}>
        <Text>{tag[0]}</Text>
      </View>
      <View style={styles.item}>
        <Text>{tag[1]}</Text>
      </View>
    </View>
  )
}


class MapScreen extends React.Component {
  static navigationOptions = {
    title: 'といれまっぷ',
  }

  constructor(props) {
    super(props)
    this.state = {
      elements: [],
      south: null,
      west: null,
      north: null,
      east: null,
    }
  }

  onRegionChangeComplete = (region) => {
    const center = point([region.longitude, region.latitude])
    const verticalMeter = 111 * region.latitudeDelta / 2
    const horizontalMeter = 111 * region.longitudeDelta / 2
    const options = {units: 'kilometers'}
    const south = destination(center, verticalMeter, 180, options)
    const west = destination(center, horizontalMeter, -90, options)
    const north = destination(center, verticalMeter, 0, options)
    const east = destination(center, horizontalMeter, 90, options)
    this.setState({
      south: south.geometry.coordinates[1],
      west: west.geometry.coordinates[0],
      north: north.geometry.coordinates[1],
      east: east.geometry.coordinates[0],
    })
  }
  fetchToilet = async () => {
    const south = this.state.south
    const west = this.state.west
    const north = this.state.north
    const east = this.state.east
    const body = `
    [out:json];
    (
      node
        [amenity=toilets]
        (${south}, ${west}, ${north}, ${east});
      node
        ["toilets:wheelchair"=yes]
        (${south}, ${west}, ${north}, ${east});
    );
    out;
    `
    const options = {
      method: 'POST',
      body: body
    }
    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', options)
      const json = await response.json()
      this.setState({elements: json.elements})
    } catch (e) {
      console.warn(e)
    }
  }

  gotoElementScreen = (element, title) => {
    this.props.navigation.navigate('Element', {
      element: element,
      title: title,
    })
  }

  render() {
    return (
      <View style={styles.container}>
        <MapView
          onRegionChangeComplete={this.onRegionChangeComplete}
          style={styles.mapview}
          initialRegion={{
            latitude: 35.681262,
            longitude: 139.766403,
            latitudeDelta: 0.00922,
            longitudeDelta: 0.00521,
          }}>
          {
            this.state.elements.map((element) => {
              let title = "といれ"
              if (element.tags["name"] !== undefined) {
                title = element.tags["name"]
              }
              return (<MapView.Marker
                coordinate={{
                  latitude: element.lat,
                  longitude: element.lon,
                }}
                title={title}
                onCalloutPress={() => this.gotoElementScreen(element, title)}
                key={"id_" + element.id}
              />)
            })
          }
          </MapView>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => this.fetchToilet()}
              style={styles.button}
            >
              <Text style={styles.buttonItem}>といれ取得!
              </Text>
            </TouchableOpacity>
          </View>
      </View>
    );
  }
}

class ElementScreen extends React.Component {
  static navigationOptions = ({navigation}) => {
    return {
      title: navigation.getParam('title', '')
    }
  }
  render() {
    const { navigation } = this.props
    const element = navigation.getParma('element', undefined)
    if (element === undefined) {
      return (<View />)
    }

    let tagItems = []
    for (const property in element.tags) {
      tagItems.push([property, element.tags[property]])
    }
    return (
      <View style={{flex: 1}}>
        <MapView
          style={{flex: 1}}
          initialRegion={{
            latitude: element.lat,
            longitude: element.lon,
            latitudeDelta: 0.00922,
            longitudeDelta: 0.00521,
          }}>
          <MapView.Marker
            coordinate={{
              latitude: element.lat,
              longitude: element.lon,
            }}
          />
        </MapView>
        <ScrollView style={{flex: 1}}>
            <FlatList
              data={tagItems}
              extraData={this.state}
              renderItem={({item}) =>
                <TagItem tag={item} />
              }
              keyExtractor={(item, index) => "tag:" + item[0]}
            />
        </ScrollView>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  mapview: {
    ...StyleSheet.absoluteFillObject,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginVertical: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  button: {
    width: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  buttonItem: {
    textAlign: 'center',
  },
  tagItem: {
    flexDirection: 'row',
  },
  tag: {
    flex:1
  },
  item: {
    flex: 1
  },
});

const RootStack = createStackNavigator(
  {
    Map: MapScreen,
    Elemnt: ElementScreen,
  },
  {
    initialRouteName: 'Map'
  }
)

export default class App extends React.Component {
  render() {
    return <RootStack />
  }
}
