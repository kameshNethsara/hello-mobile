import { View, Text } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'

export default function Index() {
  return (
    <View
      className='
        flex-1 justify-center 
        items-center
      '
    >
        <Link href={"/notifications"}>Feed Screen in Tabs</Link>
    </View>
  )
}