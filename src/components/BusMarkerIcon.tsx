import { StyleSheet, View } from 'react-native';

type Props = {
  color: string;
  cutoutColor?: string;
  size?: number;
};

export function BusMarkerIcon({
  color,
  cutoutColor = '#FFFFFF',
  size = 64,
}: Props) {
  const scale = size / 24;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
      ]}
    >
      <View
        style={[
          styles.canvas,
          {
            transform: [{ scale }],
          },
        ]}
      >
        {/* Bus Body */}
        <View
          style={[
            styles.busBody,
            {
              backgroundColor: color,
            },
          ]}
        />

        {/* Bus Left Wheel */}
        <View
          style={[
            styles.wheelLeft,
            {
              backgroundColor: color,
            },
          ]}
        />

        {/* Bus Right Wheel */}
        <View
          style={[
            styles.wheelRight,
            {
              backgroundColor: color,
            },
          ]}
        />

        {/* Windshield */}
        <View
          style={[
            styles.windshield,
            {
              backgroundColor: cutoutColor,
            },
          ]}
        />

        {/* Left Headlight */}
        <View
          style={[
            styles.headlightLeft,
            {
              backgroundColor: cutoutColor,
            },
          ]}
        />

        {/* Negative Space Halo behind Marker */}
        <View
          style={[
            styles.markerHalo,
            {
              backgroundColor: cutoutColor,
            },
          ]}
        />

        {/* Location Pin Pinhead (Inverted Teardrop) */}
        <View
          style={[
            styles.markerPin,
            {
              backgroundColor: color,
            },
          ]}
        >
          {/* Inner Hole inside Pin */}
          <View
            style={[
              styles.markerHole,
              {
                backgroundColor: cutoutColor,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    width: 24,
    height: 24,
  },
  busBody: {
    position: 'absolute',
    left: 3.5,
    top: 2,
    width: 15.5,
    height: 16,
    borderTopLeftRadius: 4.5,
    borderTopRightRadius: 4.5,
    borderBottomLeftRadius: 2.2,
    borderBottomRightRadius: 2.2,
  },
  wheelLeft: {
    position: 'absolute',
    left: 5,
    top: 18,
    width: 2.6,
    height: 2.6,
    borderBottomLeftRadius: 1.3,
    borderBottomRightRadius: 1.3,
  },
  wheelRight: {
    position: 'absolute',
    left: 10.5,
    top: 18,
    width: 2.6,
    height: 2.6,
    borderBottomLeftRadius: 1.3,
    borderBottomRightRadius: 1.3,
  },
  windshield: {
    position: 'absolute',
    left: 5.5,
    top: 5.5,
    width: 11.5,
    height: 4.5,
    borderRadius: 1,
  },
  headlightLeft: {
    position: 'absolute',
    left: 5.5,
    top: 13,
    width: 2.4,
    height: 2.4,
    borderRadius: 1.2,
  },
  markerHalo: {
    position: 'absolute',
    left: 12.8,
    top: 9.8,
    width: 10.4,
    height: 10.4,
    borderTopLeftRadius: 5.2,
    borderTopRightRadius: 5.2,
    borderBottomLeftRadius: 5.2,
    borderBottomRightRadius: 0,
    transform: [{ rotate: '45deg' }],
  },
  markerPin: {
    position: 'absolute',
    left: 13.8,
    top: 10.8,
    width: 8.4,
    height: 8.4,
    borderTopLeftRadius: 4.2,
    borderTopRightRadius: 4.2,
    borderBottomLeftRadius: 4.2,
    borderBottomRightRadius: 0,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerHole: {
    width: 2.8,
    height: 2.8,
    borderRadius: 1.4,
  },
});
