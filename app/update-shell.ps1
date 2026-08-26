$path = Join-Path $PSScriptRoot 'src/components/AppShell.tsx'
$content = Get-Content -LiteralPath $path -Raw
$old = '<View style={s.action}>{action}</View></View>'
$new = '{desktop?<View style={s.action}>{action}</View>:<Pressable accessibilityLabel="Notificações" onPress={()=>router.push(''/notifications'')} style={s.mobileBell}><Ionicons name={unread?''notifications'':''notifications-outline''} size={20} color={theme.white}/>{unread>0&&<View style={s.badge}><Text style={s.badgeText}>{unread>9?''9+'':unread}</Text></View>}</Pressable>}</View>'
$content = $content.Replace($old, $new)
$content = $content.Replace("mobileBellWrap:{position:'absolute',right:12,top:10,zIndex:4},mobileBell:{width:42,height:42,borderRadius:21,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center'},", "mobilePageHeader:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:18},mobileHeading:{flex:1,minWidth:0},mobilePageTitle:{fontSize:24,fontWeight:'800',color:theme.ink},mobilePageSubtitle:{fontSize:12,color:theme.muted,marginTop:4,lineHeight:18},mobilePageAction:{alignSelf:'flex-start'},mobileBell:{width:40,height:40,borderRadius:20,backgroundColor:'rgba(255,255,255,.12)',alignItems:'center',justifyContent:'center'},")
$content = $content.Replace("topbarMobile:{minHeight:62,paddingHorizontal:14}", "topbarMobile:{minHeight:58,paddingHorizontal:14,backgroundColor:theme.green,borderBottomColor:theme.green}")
$content = $content.Replace("mobileLogo:{fontFamily:'serif',fontSize:20,fontWeight:'700',color:theme.ink}", "mobileLogo:{fontFamily:'serif',fontSize:20,fontWeight:'700',color:theme.white}")
Set-Content -LiteralPath $path -Value $content -Encoding utf8
