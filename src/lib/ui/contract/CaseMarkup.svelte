<script module lang="ts">
  import Accordion from '../components/Accordion.svelte';
  import AccordionItem from '../components/AccordionItem.svelte';
  import Alert from '../components/Alert.svelte';
  import AppearanceChoices from '../components/AppearanceChoices.svelte';
  import AppearanceSwitcher from '../components/AppearanceSwitcher.svelte';
  import Avatar from '../components/Avatar.svelte';
  import AvatarStack from '../components/AvatarStack.svelte';
  import Badge from '../components/Badge.svelte';
  import Breadcrumb from '../components/Breadcrumb.svelte';
  import BreakpointProbe from '../components/BreakpointProbe.svelte';
  import Button from '../components/Button.svelte';
  import ButtonGroup from '../components/ButtonGroup.svelte';
  import Card from '../components/Card.svelte';
  import Carousel from '../components/Carousel.svelte';
  import Checkbox from '../components/Checkbox.svelte';
  import ChromeBar from '../components/ChromeBar.svelte';
  import CodeBlock from '../components/CodeBlock.svelte';
  import CommandItem from '../components/CommandItem.svelte';
  import Diagram from '../components/Diagram.svelte';
  import Divider from '../components/Divider.svelte';
  import Dock from '../components/Dock.svelte';
  import Dropdown from '../components/Dropdown.svelte';
  import DropdownItem from '../components/DropdownItem.svelte';
  import DropdownLabel from '../components/DropdownLabel.svelte';
  import DropdownSeparator from '../components/DropdownSeparator.svelte';
  import Dropzone from '../components/Dropzone.svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import Field from '../components/Field.svelte';
  import Fieldset from '../components/Fieldset.svelte';
  import Figure from '../components/Figure.svelte';
  import FileItem from '../components/FileItem.svelte';
  import FileList from '../components/FileList.svelte';
  import Highlight from '../components/Highlight.svelte';
  import IconButton from '../components/IconButton.svelte';
  import Input from '../components/Input.svelte';
  import InputGroup from '../components/InputGroup.svelte';
  import InputGroupAddon from '../components/InputGroupAddon.svelte';
  import KeyHints from '../components/KeyHints.svelte';
  import ListGroup from '../components/ListGroup.svelte';
  import ListRow from '../components/ListRow.svelte';
  import MarqueeSelection from '../components/MarqueeSelection.svelte';
  import Modal from '../components/Modal.svelte';
  import NavLink from '../components/NavLink.svelte';
  import OverflowList from '../components/OverflowList.svelte';
  import PageHeader from '../components/PageHeader.svelte';
  import Pagination from '../components/Pagination.svelte';
  import Popover from '../components/Popover.svelte';
  import Progress from '../components/Progress.svelte';
  import Radio from '../components/Radio.svelte';
  import SearchField from '../components/SearchField.svelte';
  import SegmentedControl from '../components/SegmentedControl.svelte';
  import Select from '../components/Select.svelte';
  import SettingsRow from '../components/SettingsRow.svelte';
  import Skeleton from '../components/Skeleton.svelte';
  import Slider from '../components/Slider.svelte';
  import Stat from '../components/Stat.svelte';
  import StatusIcon from '../components/StatusIcon.svelte';
  import StepItem from '../components/StepItem.svelte';
  import StepList from '../components/StepList.svelte';
  import Stepper from '../components/Stepper.svelte';
  import Table from '../components/Table.svelte';
  import TableBody from '../components/TableBody.svelte';
  import TableCell from '../components/TableCell.svelte';
  import TableHeader from '../components/TableHeader.svelte';
  import TableHeaderCell from '../components/TableHeaderCell.svelte';
  import TableOfContents from '../components/TableOfContents.svelte';
  import TableRow from '../components/TableRow.svelte';
  import Tabs from '../components/Tabs.svelte';
  import Tag from '../components/Tag.svelte';
  import TagToggle from '../components/TagToggle.svelte';
  import Textarea from '../components/Textarea.svelte';
  import Thumbnail from '../components/Thumbnail.svelte';
  import Toast from '../components/Toast.svelte';
  import ToastClearance from '../components/ToastClearance.svelte';
  import ToastRegion from '../components/ToastRegion.svelte';
  import Toggle from '../components/Toggle.svelte';
  import WindowDropzone from '../components/WindowDropzone.svelte';
  import Ellipsis from '../components/icons/Ellipsis.svelte';
  import LayoutGrid from '../components/icons/LayoutGrid.svelte';
  import Search from '../components/icons/Search.svelte';
  import {
    CLEARED_TOASTER,
    EDGES,
    ENTRIES,
    FILES,
    HINTS,
    NAMES,
    NODES,
    OPTIONS,
    OPTIONS_WITH_DISABLED,
    REGION_TOASTER,
    SEGMENTS,
    SLIDES,
    SOURCE,
    TABS,
    TABS_WITH_DISABLED,
    TOASTS,
  } from './case-data';

  export {
    accordionDefault,
    accordionItemClosed,
    accordionItemOpen,
    alertInfo,
    alertSuccess,
    alertWarning,
    alertDanger,
    alertTitleOnly,
    alertDescriptionOnly,
    alertActions,
    alertDismissible,
    alertBanner,
    appearanceSwitcherAutomatic,
    appearanceSwitcherLight,
    appearanceSwitcherDark,
    appearanceSwitcherYorha,
    appearanceChoicesDefault,
    appearanceChoicesEmberDark,
    avatarDefault,
    avatarSm,
    avatarLg,
    avatarSquare,
    avatarAccent,
    avatarImage,
    avatarStackDefault,
    avatarStackOverflow,
    badgeNeutral,
    badgeSuccess,
    badgeWarning,
    badgeDanger,
    badgeInfo,
    badgePrimary,
    badgeAccent,
    badgeSolid,
    badgeQuiet,
    badgeDot,
    badgeColorSlate,
    badgeColorClay,
    badgeColorSage,
    badgeColorPlum,
    badgeColorRose,
    badgeColorIce,
    badgeColorRuby,
    badgeColorCopper,
    badgeColorOlive,
    badgeColorFern,
    badgeColorCyan,
    badgeColorSky,
    badgeColorIndigo,
    badgeColorViolet,
    badgeColorMagenta,
    badgeColorStone,
    breadcrumbDefault,
    breadcrumbLabelled,
    breakpointProbeDefault,
    buttonDefault,
    buttonPrimary,
    buttonAccent,
    buttonOutline,
    buttonGhost,
    buttonDanger,
    buttonGhostDanger,
    buttonSm,
    buttonLg,
    buttonSquare,
    buttonBlock,
    buttonPill,
    buttonWrap,
    buttonLoading,
    buttonActive,
    buttonDisabled,
    buttonSubmit,
    buttonLink,
    buttonWithIcon,
    buttonGroupLabelled,
    buttonGroupLabelledBy,
    cardDefault,
    cardElevated,
    cardFeature,
    cardSm,
    cardHeadingH2,
    cardFull,
    cardLink,
    cardCover,
    cardMediaPortrait,
    carouselDefault,
    carouselDriven,
    carouselGapRtl,
    checkboxDefault,
    checkboxChecked,
    checkboxHint,
    checkboxDisabled,
    chromeBarTop,
    chromeBarTopHidden,
    chromeBarBottom,
    codeBlockDefault,
    codeBlockChildren,
    codeBlockWrap,
    codeBlockLabelled,
    codeBlockCopy,
    codeBlockCopied,
    commandItemButton,
    commandItemLink,
    commandItemStatic,
    commandItemSelected,
    commandItemHint,
    diagramDefault,
    diagramBoxesOnly,
    dividerDefault,
    dividerStrong,
    dividerVertical,
    dividerLabeled,
    dividerLabeledStrong,
    dockSide,
    dockRail,
    dockSheet,
    dockPeek,
    dropdownDefault,
    dropdownIcon,
    dropdownIconWithoutTooltip,
    dropdownPrimarySm,
    dropdownWithoutChevron,
    dropdownItemButton,
    dropdownItemSelected,
    dropdownItemUnselected,
    dropdownItemDanger,
    dropdownItemHint,
    dropdownItemDisabled,
    dropdownItemLink,
    dropdownItemCurrentLink,
    dropdownLabelDefault,
    dropdownSeparatorDefault,
    dropzoneDefault,
    dropzoneSm,
    dropzoneTitled,
    dropzoneInvalid,
    dropzoneDisabled,
    dropzoneDirectory,
    emptyStateInline,
    emptyStateFill,
    emptyStateLive,
    emptyStateAction,
    fieldDefault,
    fieldHint,
    fieldError,
    fieldHintAndError,
    fieldAnnouncedError,
    fieldHiddenLabel,
    fieldInline,
    fieldsetDefault,
    fieldsetHint,
    figureDefault,
    figureFull,
    fileItemPending,
    fileItemUploading,
    fileItemComplete,
    fileItemError,
    fileItemRemovable,
    fileListDefault,
    highlightDefault,
    iconButtonDefault,
    iconButtonTooltip,
    iconButtonWithoutTooltip,
    iconButtonGhostSm,
    iconButtonLink,
    iconButtonChildren,
    inputDefault,
    inputPlaceholder,
    inputDisabled,
    inputGroupDefault,
    inputGroupAddonIcon,
    inputGroupAddonText,
    keyHintsChips,
    keyHintsInline,
    keyHintsText,
    keyHintsSm,
    keyHintsDecorativeFooter,
    listGroupDefault,
    listGroupTitled,
    listGroupInsetH3,
    listGroupSummary,
    listRowDefault,
    listRowDescription,
    listRowValue,
    listRowValueFaint,
    listRowActions,
    listRowSmStrong,
    listRowChildren,
    listRowListed,
    marqueeSelectionIdle,
    modalDefault,
    modalSm,
    modalLg,
    modalTop,
    modalFillNarrow,
    modalFlushBody,
    modalFooter,
    modalInfoFooter,
    modalWithoutCloseButton,
    modalCustomHeader,
    modalLabelledBy,
    navLinkDefault,
    navLinkCurrent,
    navLinkStrong,
    navLinkIcon,
    overflowListFits,
    overflowListOverflowing,
    overflowListInline,
    pageHeaderDefault,
    pageHeaderMetaLang,
    pageHeaderBack,
    pageHeaderBackCompact,
    paginationFirst,
    paginationMiddle,
    paginationLast,
    paginationLinks,
    popoverDefault,
    progressDefault,
    progressIndeterminate,
    progressSuccess,
    progressWarning,
    progressDanger,
    progressAccent,
    progressSm,
    progressLgMax,
    radioDefault,
    radioHint,
    radioTile,
    radioBare,
    searchFieldDefault,
    searchFieldHiddenLabel,
    searchFieldClearableEmpty,
    searchFieldClearableFilled,
    searchFieldTextWithId,
    segmentedControlDefault,
    segmentedControlGhost,
    segmentedControlOutline,
    segmentedControlTrack,
    segmentedControlTrackDisabledOption,
    segmentedControlUnlabelled,
    selectDefault,
    settingsRowDefault,
    skeletonDefault,
    skeletonText,
    skeletonTitle,
    skeletonCircle,
    skeletonBlock,
    skeletonWidth,
    sliderDefault,
    sliderValuetextStep,
    sliderRtl,
    sliderTicks,
    statDefault,
    statDeltaUp,
    statDeltaDown,
    statDeltaFlat,
    statSm,
    statListed,
    statusIconInfo,
    statusIconSuccess,
    statusIconWarning,
    statusIconDanger,
    stepItemDefault,
    stepItemTitleOnlyH4,
    stepListDefault,
    stepperLinks,
    stepperActionsBlock,
    stepperMissingDisabled,
    stepperMissingHidden,
    stepperStatusSpaced,
    stepperNoSteps,
    tableDefault,
    tableStripedSmCaption,
    tableBodyDefault,
    tableCellDefault,
    tableCellNumeric,
    tableCellActions,
    tableHeaderDefault,
    tableHeaderCellDefault,
    tableHeaderCellNumeric,
    tableHeaderCellActions,
    tableRowDefault,
    tableOfContentsCurrentEntry,
    tableOfContentsDefault,
    tableOfContentsTitledH3,
    tabsUnderline,
    tabsPill,
    tabsSecondSelected,
    tabsDisabledTab,
    tabsActions,
    tagDefault,
    tagLink,
    tagRemovable,
    tagColorSlate,
    tagColorClay,
    tagColorSage,
    tagColorPlum,
    tagColorRose,
    tagColorIce,
    tagColorRuby,
    tagColorCopper,
    tagColorOlive,
    tagColorFern,
    tagColorCyan,
    tagColorSky,
    tagColorIndigo,
    tagColorViolet,
    tagColorMagenta,
    tagColorStone,
    tagToggleDefault,
    tagTogglePressed,
    tagToggleColor,
    textareaDefault,
    textareaPlaceholder,
    thumbnailImage,
    thumbnailNamed,
    thumbnailBlank,
    thumbnailSmSquare,
    thumbnailLgVideo,
    thumbnailFillBordered,
    toastInfo,
    toastSuccess,
    toastWarning,
    toastDanger,
    toastMessage,
    toastTimed,
    toastAction,
    toastClearanceDefault,
    toastRegionBottom,
    toastRegionTop,
    toastRegionCleared,
    toastRegionWithoutClearance,
    toggleDefault,
    toggleChecked,
    toggleDisabled,
    windowDropzoneIdle,
  };
</script>

{#snippet accordionDefault()}<Accordion
    ><AccordionItem title="Shipping">Ships in two days.</AccordionItem><AccordionItem
      title="Returns">Within thirty days.</AccordionItem
    ></Accordion
  >{/snippet}

{#snippet accordionItemClosed()}<AccordionItem title="Details">Body</AccordionItem>{/snippet}

{#snippet accordionItemOpen()}<AccordionItem title="Details" open>Body</AccordionItem>{/snippet}

{#snippet alertInfo()}<Alert variant="info" title="Heads up">The sync finished.</Alert>{/snippet}

{#snippet alertSuccess()}<Alert variant="success" title="Heads up">The sync finished.</Alert
  >{/snippet}

{#snippet alertWarning()}<Alert variant="warning" title="Heads up">The sync finished.</Alert
  >{/snippet}

{#snippet alertDanger()}<Alert variant="danger" title="Heads up">The sync finished.</Alert
  >{/snippet}

{#snippet alertTitleOnly()}<Alert title="Saved" />{/snippet}

{#snippet alertDescriptionOnly()}<Alert>The sync finished.</Alert>{/snippet}

{#snippet alertActions()}<Alert title="Update ready"
    >{#snippet actions()}<Button size="sm">Reload</Button>{/snippet}A new version is ready.</Alert
  >{/snippet}

{#snippet alertDismissible()}<Alert title="Saved" ondismiss={() => {}} />{/snippet}

{#snippet alertBanner()}<Alert variant="warning" banner title="Offline"
    >Changes are kept locally.</Alert
  >{/snippet}

{#snippet appearanceSwitcherAutomatic()}<AppearanceSwitcher
    appearance={{ theme: 'base', colorScheme: 'automatic' }}
  />{/snippet}

{#snippet appearanceSwitcherLight()}<AppearanceSwitcher
    appearance={{ theme: 'base', colorScheme: 'light' }}
  />{/snippet}

{#snippet appearanceSwitcherDark()}<AppearanceSwitcher
    appearance={{ theme: 'base', colorScheme: 'dark' }}
  />{/snippet}

{#snippet appearanceSwitcherYorha()}<AppearanceSwitcher
    appearance={{ theme: 'yorha', colorScheme: 'automatic' }}
  />{/snippet}

{#snippet appearanceChoicesDefault()}<AppearanceChoices
    appearance={{ theme: 'base', colorScheme: 'automatic' }}
  />{/snippet}

{#snippet appearanceChoicesEmberDark()}<AppearanceChoices
    appearance={{ theme: 'ember', colorScheme: 'dark' }}
  />{/snippet}

{#snippet avatarDefault()}<Avatar>AL</Avatar>{/snippet}

{#snippet avatarSm()}<Avatar size="sm">AL</Avatar>{/snippet}

{#snippet avatarLg()}<Avatar size="lg">AL</Avatar>{/snippet}

{#snippet avatarSquare()}<Avatar shape="square">AL</Avatar>{/snippet}

{#snippet avatarAccent()}<Avatar variant="accent">AL</Avatar>{/snippet}

{#snippet avatarImage()}<Avatar src="/avatar.png" alt="Ada Lovelace" />{/snippet}

{#snippet avatarStackDefault()}<AvatarStack label="Readers"
    ><Avatar>AL</Avatar><Avatar>GH</Avatar></AvatarStack
  >{/snippet}

{#snippet avatarStackOverflow()}<AvatarStack label="Readers" overflow={3}
    ><Avatar>AL</Avatar><Avatar>GH</Avatar></AvatarStack
  >{/snippet}

{#snippet badgeNeutral()}<Badge variant="neutral">Read</Badge>{/snippet}

{#snippet badgeSuccess()}<Badge variant="success">Read</Badge>{/snippet}

{#snippet badgeWarning()}<Badge variant="warning">Read</Badge>{/snippet}

{#snippet badgeDanger()}<Badge variant="danger">Read</Badge>{/snippet}

{#snippet badgeInfo()}<Badge variant="info">Read</Badge>{/snippet}

{#snippet badgePrimary()}<Badge variant="primary">Read</Badge>{/snippet}

{#snippet badgeAccent()}<Badge variant="accent">Read</Badge>{/snippet}

{#snippet badgeSolid()}<Badge variant="success" emphasis="solid">Read</Badge>{/snippet}

{#snippet badgeQuiet()}<Badge variant="success" emphasis="quiet">Read</Badge>{/snippet}

{#snippet badgeDot()}<Badge variant="success" dot>Read</Badge>{/snippet}

{#snippet badgeColorSlate()}<Badge color="slate">Read</Badge>{/snippet}

{#snippet badgeColorClay()}<Badge color="clay">Read</Badge>{/snippet}

{#snippet badgeColorSage()}<Badge color="sage">Read</Badge>{/snippet}

{#snippet badgeColorPlum()}<Badge color="plum">Read</Badge>{/snippet}

{#snippet badgeColorRose()}<Badge color="rose">Read</Badge>{/snippet}

{#snippet badgeColorIce()}<Badge color="ice">Read</Badge>{/snippet}

{#snippet badgeColorRuby()}<Badge color="ruby">Read</Badge>{/snippet}

{#snippet badgeColorCopper()}<Badge color="copper">Read</Badge>{/snippet}

{#snippet badgeColorOlive()}<Badge color="olive">Read</Badge>{/snippet}

{#snippet badgeColorFern()}<Badge color="fern">Read</Badge>{/snippet}

{#snippet badgeColorCyan()}<Badge color="cyan">Read</Badge>{/snippet}

{#snippet badgeColorSky()}<Badge color="sky">Read</Badge>{/snippet}

{#snippet badgeColorIndigo()}<Badge color="indigo">Read</Badge>{/snippet}

{#snippet badgeColorViolet()}<Badge color="violet">Read</Badge>{/snippet}

{#snippet badgeColorMagenta()}<Badge color="magenta">Read</Badge>{/snippet}

{#snippet badgeColorStone()}<Badge color="stone">Read</Badge>{/snippet}

{#snippet breadcrumbDefault()}<Breadcrumb
    items={[
      { label: 'Home', href: '/' },
      { label: 'Library', href: '/library' },
      { label: 'Settings' },
    ]}
  />{/snippet}

{#snippet breadcrumbLabelled()}<Breadcrumb
    label="You are here"
    items={[{ label: 'Home', href: '/' }, { label: 'Settings' }]}
  />{/snippet}

{#snippet breakpointProbeDefault()}<BreakpointProbe breakpoint="--breakpoint-compact" />{/snippet}

{#snippet buttonDefault()}<Button>Save</Button>{/snippet}

{#snippet buttonPrimary()}<Button variant="primary">Save</Button>{/snippet}

{#snippet buttonAccent()}<Button variant="accent">Save</Button>{/snippet}

{#snippet buttonOutline()}<Button variant="outline">Save</Button>{/snippet}

{#snippet buttonGhost()}<Button variant="ghost">Save</Button>{/snippet}

{#snippet buttonDanger()}<Button variant="danger">Save</Button>{/snippet}

{#snippet buttonGhostDanger()}<Button variant="ghost-danger">Save</Button>{/snippet}

{#snippet buttonSm()}<Button size="sm">Save</Button>{/snippet}

{#snippet buttonLg()}<Button size="lg">Save</Button>{/snippet}

{#snippet buttonSquare()}<Button square>+</Button>{/snippet}

{#snippet buttonBlock()}<Button block>Save</Button>{/snippet}

{#snippet buttonPill()}<Button pill>Save</Button>{/snippet}

{#snippet buttonWrap()}<Button wrap>Save</Button>{/snippet}

{#snippet buttonLoading()}<Button loading>Save</Button>{/snippet}

{#snippet buttonActive()}<Button active>Save</Button>{/snippet}

{#snippet buttonDisabled()}<Button disabled>Save</Button>{/snippet}

{#snippet buttonSubmit()}<Button type="submit" variant="primary">Save</Button>{/snippet}

{#snippet buttonLink()}<Button href="/docs" variant="ghost">Open</Button>{/snippet}

{#snippet buttonWithIcon()}<Button><Search class="btn-icon" />Search</Button>{/snippet}

{#snippet buttonGroupLabelled()}<ButtonGroup label="Zoom"
    ><Button>-</Button><Button>+</Button></ButtonGroup
  >{/snippet}

{#snippet buttonGroupLabelledBy()}<ButtonGroup aria-labelledby="zoom-label"
    ><Button>-</Button><Button>+</Button></ButtonGroup
  >{/snippet}

{#snippet cardDefault()}<Card
    >{#snippet title()}Getting started{/snippet}{#snippet description()}Read the guide.{/snippet}</Card
  >{/snippet}

{#snippet cardElevated()}<Card variant="elevated">{#snippet title()}Getting started{/snippet}</Card
  >{/snippet}

{#snippet cardFeature()}<Card variant="feature">{#snippet title()}Getting started{/snippet}</Card
  >{/snippet}

{#snippet cardSm()}<Card size="sm">{#snippet title()}Getting started{/snippet}</Card>{/snippet}

{#snippet cardHeadingH2()}<Card heading="h2">{#snippet title()}Getting started{/snippet}</Card
  >{/snippet}

{#snippet cardFull()}<Card
    >{#snippet media()}<img
        src="/cover.png"
        alt=""
      />{/snippet}{#snippet eyebrow()}Guide{/snippet}{#snippet title()}Getting started{/snippet}{#snippet description()}Read
      the guide.{/snippet}{#snippet footer()}<Button size="sm">Open</Button>{/snippet}
    <p>Body text.</p></Card
  >{/snippet}

{#snippet cardLink()}<Card href="/guide" tooltip="Open the guide"
    >{#snippet title()}Getting started{/snippet}</Card
  >{/snippet}

{#snippet cardCover()}<Card mediaRatio="square"
    >{#snippet media()}<img src="/cover.png" alt="Cover" />{/snippet}</Card
  >{/snippet}

{#snippet cardMediaPortrait()}<Card mediaRatio="portrait"
    >{#snippet media()}<img src="/cover.png" alt="" />{/snippet}{#snippet title()}Getting started{/snippet}</Card
  >{/snippet}

{#snippet carouselDefault()}<Carousel slides={SLIDES}
    >{#snippet slide(item)}<p>{item.key}</p>{/snippet}</Carousel
  >{/snippet}

{#snippet carouselDriven()}<Carousel slides={SLIDES} driven
    >{#snippet slide(item)}<p>{item.key}</p>{/snippet}</Carousel
  >{/snippet}

{#snippet carouselGapRtl()}<Carousel slides={SLIDES} gap={16} dir="rtl"
    >{#snippet slide(item)}<p>{item.key}</p>{/snippet}</Carousel
  >{/snippet}

{#snippet checkboxDefault()}<Checkbox>Remember me</Checkbox>{/snippet}

{#snippet checkboxChecked()}<Checkbox checked>Remember me</Checkbox>{/snippet}

{#snippet checkboxHint()}<Checkbox hint="Stay signed in on this device">Remember me</Checkbox
  >{/snippet}

{#snippet checkboxDisabled()}<Checkbox disabled>Remember me</Checkbox>{/snippet}

{#snippet chromeBarTop()}<ChromeBar edge="top" shown>Title</ChromeBar>{/snippet}

{#snippet chromeBarTopHidden()}<ChromeBar edge="top" shown={false}>Title</ChromeBar>{/snippet}

{#snippet chromeBarBottom()}<ChromeBar edge="bottom" shown>Controls</ChromeBar>{/snippet}

{#snippet codeBlockDefault()}<CodeBlock code={'const a = 1;'} />{/snippet}

{#snippet codeBlockChildren()}<CodeBlock>const a = 1;</CodeBlock>{/snippet}

{#snippet codeBlockWrap()}<CodeBlock code={'const a = 1;'} wrap />{/snippet}

{#snippet codeBlockLabelled()}<CodeBlock code={'const a = 1;'} label="Example" />{/snippet}

{#snippet codeBlockCopy()}<CodeBlock code={'const a = 1;'} oncopy={() => {}} />{/snippet}

{#snippet codeBlockCopied()}<CodeBlock code={'const a = 1;'} oncopy={() => {}} copied />{/snippet}

{#snippet commandItemButton()}<CommandItem>Open settings</CommandItem>{/snippet}

{#snippet commandItemLink()}<CommandItem href="/settings">Open settings</CommandItem>{/snippet}

{#snippet commandItemStatic()}<CommandItem element="div">Open settings</CommandItem>{/snippet}

{#snippet commandItemSelected()}<CommandItem selected>Open settings</CommandItem>{/snippet}

{#snippet commandItemHint()}<CommandItem hint="設定" hintLang="ja">Open settings</CommandItem
  >{/snippet}

{#snippet diagramDefault()}<Diagram
    label="How data flows"
    width={380}
    height={240}
    nodes={NODES}
    edges={EDGES}
  />{/snippet}

{#snippet diagramBoxesOnly()}<Diagram
    label="One box"
    width={160}
    height={80}
    nodes={[SOURCE]}
  />{/snippet}

{#snippet dividerDefault()}<Divider />{/snippet}

{#snippet dividerStrong()}<Divider strong />{/snippet}

{#snippet dividerVertical()}<Divider vertical />{/snippet}

{#snippet dividerLabeled()}<Divider>Or</Divider>{/snippet}

{#snippet dividerLabeledStrong()}<Divider strong>Or</Divider>{/snippet}

{#snippet dockSide()}<Dock
    placement="side"
    label="Notes"
    expandLabel="Show notes"
    collapseLabel="Hide notes"
    resizeLabel="Resize notes"
    ontoggle={() => {}}><p>Panel</p></Dock
  >{/snippet}

{#snippet dockRail()}<Dock
    placement="rail"
    count={3}
    label="Notes"
    expandLabel="Show notes"
    collapseLabel="Hide notes"
    resizeLabel="Resize notes"
    ontoggle={() => {}}><p>Panel</p></Dock
  >{/snippet}

{#snippet dockSheet()}<Dock
    placement="sheet"
    label="Notes"
    expandLabel="Show notes"
    collapseLabel="Hide notes"
    resizeLabel="Resize notes"
    ontoggle={() => {}}><p>Panel</p></Dock
  >{/snippet}

{#snippet dockPeek()}<Dock
    placement="peek"
    count={3}
    label="Notes"
    expandLabel="Show notes"
    collapseLabel="Hide notes"
    resizeLabel="Resize notes"
    ontoggle={() => {}}><p>Panel</p></Dock
  >{/snippet}

{#snippet dropdownDefault()}<Dropdown
    >{#snippet trigger()}Sort{/snippet}<DropdownLabel>Order</DropdownLabel><DropdownItem
      selected={true}>Newest</DropdownItem
    ><DropdownItem selected={false}>Oldest</DropdownItem><DropdownSeparator /><DropdownItem danger
      >Clear</DropdownItem
    ></Dropdown
  >{/snippet}

{#snippet dropdownIcon()}<Dropdown icon={Ellipsis} label="More actions" square
    ><DropdownItem>Rename</DropdownItem></Dropdown
  >{/snippet}

{#snippet dropdownIconWithoutTooltip()}<Dropdown
    icon={Ellipsis}
    label="More actions"
    tooltip={false}
    chevron={false}
    square><DropdownItem>Rename</DropdownItem></Dropdown
  >{/snippet}

{#snippet dropdownPrimarySm()}<Dropdown variant="primary" size="sm" align="end"
    >{#snippet trigger()}Add{/snippet}<DropdownItem href="/new">New book</DropdownItem></Dropdown
  >{/snippet}

{#snippet dropdownWithoutChevron()}<Dropdown chevron={false}
    >{#snippet trigger()}Sort{/snippet}<DropdownItem>Newest</DropdownItem></Dropdown
  >{/snippet}

{#snippet dropdownItemButton()}<DropdownItem>Rename</DropdownItem>{/snippet}

{#snippet dropdownItemSelected()}<DropdownItem selected={true}>Newest</DropdownItem>{/snippet}

{#snippet dropdownItemUnselected()}<DropdownItem selected={false}>Oldest</DropdownItem>{/snippet}

{#snippet dropdownItemDanger()}<DropdownItem danger>Delete</DropdownItem>{/snippet}

{#snippet dropdownItemHint()}<DropdownItem hint="Ctrl+R">Rename</DropdownItem>{/snippet}

{#snippet dropdownItemDisabled()}<DropdownItem disabled>Rename</DropdownItem>{/snippet}

{#snippet dropdownItemLink()}<DropdownItem href="/settings">Settings</DropdownItem>{/snippet}

{#snippet dropdownItemCurrentLink()}<DropdownItem href="/settings" current>Settings</DropdownItem
  >{/snippet}

{#snippet dropdownLabelDefault()}<DropdownLabel>Order</DropdownLabel>{/snippet}

{#snippet dropdownSeparatorDefault()}<DropdownSeparator />{/snippet}

{#snippet dropzoneDefault()}<Dropzone onfiles={() => {}} />{/snippet}

{#snippet dropzoneSm()}<Dropzone size="sm" onfiles={() => {}} />{/snippet}

{#snippet dropzoneTitled()}<Dropzone
    title="Drop a book"
    hint="EPUB or PDF, up to 50 MB"
    accept=".epub,.pdf"
    multiple
    onfiles={() => {}}
  />{/snippet}

{#snippet dropzoneInvalid()}<Dropzone invalid onfiles={() => {}} />{/snippet}

{#snippet dropzoneDisabled()}<Dropzone disabled onfiles={() => {}} />{/snippet}

{#snippet dropzoneDirectory()}<Dropzone directory onfiles={() => {}} />{/snippet}

{#snippet emptyStateInline()}<EmptyState message="No books yet." />{/snippet}

{#snippet emptyStateFill()}<EmptyState variant="fill" message="No books yet." />{/snippet}

{#snippet emptyStateLive()}<EmptyState live message="No results." />{/snippet}

{#snippet emptyStateAction()}<EmptyState message="No books yet."
    >{#snippet action()}<Button>Add a book</Button>{/snippet}</EmptyState
  >{/snippet}

{#snippet fieldDefault()}<Field label="Name"
    >{#snippet children(control)}<Input {...control} />{/snippet}</Field
  >{/snippet}

{#snippet fieldHint()}<Field label="Name" hint="As it appears on the cover"
    >{#snippet children(control)}<Input {...control} />{/snippet}</Field
  >{/snippet}

{#snippet fieldError()}<Field label="Name" error="Enter a name"
    >{#snippet children(control)}<Input {...control} />{/snippet}</Field
  >{/snippet}

{#snippet fieldHintAndError()}<Field
    label="Name"
    hint="As it appears on the cover"
    error="Enter a name">{#snippet children(control)}<Input {...control} />{/snippet}</Field
  >{/snippet}

{#snippet fieldAnnouncedError()}<Field label="Name" error="Enter a name" announceError
    >{#snippet children(control)}<Input {...control} />{/snippet}</Field
  >{/snippet}

{#snippet fieldHiddenLabel()}<Field label="Name" hideLabel
    >{#snippet children(control)}<Input {...control} />{/snippet}</Field
  >{/snippet}

{#snippet fieldInline()}<Field label="Name" layout="inline"
    >{#snippet children(control)}<Input {...control} />{/snippet}</Field
  >{/snippet}

{#snippet fieldsetDefault()}<Fieldset legend="Reading direction"
    ><Radio name="dir" value="ltr">Left to right</Radio></Fieldset
  >{/snippet}

{#snippet fieldsetHint()}<Fieldset legend="Reading direction" hint="Applies to this book"
    ><Radio name="dir" value="ltr">Left to right</Radio></Fieldset
  >{/snippet}

{#snippet figureDefault()}<Figure><img src="/chart.png" alt="Chart" /></Figure>{/snippet}

{#snippet figureFull()}<Figure
    >{#snippet title()}Figure 1{/snippet}{#snippet actions()}<Button size="sm">Copy</Button
      >{/snippet}{#snippet caption()}Reading time per week.{/snippet}<img
      src="/chart.png"
      alt="Chart"
    /></Figure
  >{/snippet}

{#snippet fileItemPending()}<FileItem item={FILES.pending} />{/snippet}

{#snippet fileItemUploading()}<FileItem item={FILES.uploading} onremove={() => {}} />{/snippet}

{#snippet fileItemComplete()}<FileItem item={FILES.complete} />{/snippet}

{#snippet fileItemError()}<FileItem item={FILES.error} onremove={() => {}} />{/snippet}

{#snippet fileItemRemovable()}<FileItem item={FILES.pending} onremove={() => {}} />{/snippet}

{#snippet fileListDefault()}<FileList
    items={[FILES.pending, FILES.complete]}
    onremove={() => {}}
  />{/snippet}

{#snippet highlightDefault()}<Highlight segments={SEGMENTS} />{/snippet}

{#snippet iconButtonDefault()}<IconButton icon={Search} label="Search" />{/snippet}

{#snippet iconButtonTooltip()}<IconButton
    icon={Search}
    label="Search"
    tooltip="Search the library"
  />{/snippet}

{#snippet iconButtonWithoutTooltip()}<IconButton
    icon={Search}
    label="Search"
    tooltip={false}
  />{/snippet}

{#snippet iconButtonGhostSm()}<IconButton
    icon={Search}
    label="Search"
    variant="ghost"
    size="sm"
  />{/snippet}

{#snippet iconButtonLink()}<IconButton icon={Search} label="Search" href="/search" />{/snippet}

{#snippet iconButtonChildren()}<IconButton label="Search"><Search /></IconButton>{/snippet}

{#snippet inputDefault()}<Input />{/snippet}

{#snippet inputPlaceholder()}<Input type="email" placeholder="you@example.com" />{/snippet}

{#snippet inputDisabled()}<Input disabled value="Locked" />{/snippet}

{#snippet inputGroupDefault()}<InputGroup
    ><InputGroupAddon icon={Search} /><Input placeholder="Search" /><Button>Go</Button></InputGroup
  >{/snippet}

{#snippet inputGroupAddonIcon()}<InputGroupAddon icon={Search} />{/snippet}

{#snippet inputGroupAddonText()}<InputGroupAddon>https://</InputGroupAddon>{/snippet}

{#snippet keyHintsChips()}<KeyHints hints={HINTS} />{/snippet}

{#snippet keyHintsInline()}<KeyHints variant="inline" hints={HINTS} />{/snippet}

{#snippet keyHintsText()}<KeyHints variant="text" hints={HINTS} />{/snippet}

{#snippet keyHintsSm()}<KeyHints size="sm" hints={HINTS} />{/snippet}

{#snippet keyHintsDecorativeFooter()}<KeyHints
    element="footer"
    decorative
    hints={HINTS}
  />{/snippet}

{#snippet listGroupDefault()}<ListGroup><ListRow title="Theme" value="Ember" /></ListGroup
  >{/snippet}

{#snippet listGroupTitled()}<ListGroup title="Appearance"
    ><ListRow title="Theme" value="Ember" /></ListGroup
  >{/snippet}

{#snippet listGroupInsetH3()}<ListGroup title="Appearance" heading="h3" variant="inset"
    ><ListRow title="Theme" value="Ember" /></ListGroup
  >{/snippet}

{#snippet listGroupSummary()}<ListGroup
    ><ListRow title="Theme" value="Ember" />{#snippet summary()}<ListRow
        listed
        title="Total"
        value="3"
      />{/snippet}</ListGroup
  >{/snippet}

{#snippet listRowDefault()}<ListRow title="Theme" />{/snippet}

{#snippet listRowDescription()}<ListRow title="Theme" description="Colours and fonts" />{/snippet}

{#snippet listRowValue()}<ListRow title="Theme" value="Ember" />{/snippet}

{#snippet listRowValueFaint()}<ListRow title="Theme" value="Ember" valueTone="faint" />{/snippet}

{#snippet listRowActions()}<ListRow title="Theme"
    >{#snippet actions()}<Button size="sm">Change</Button>{/snippet}</ListRow
  >{/snippet}

{#snippet listRowSmStrong()}<ListRow title="Theme" size="sm" strong />{/snippet}

{#snippet listRowChildren()}<ListRow title="Theme"><p>More</p></ListRow>{/snippet}

{#snippet listRowListed()}<ListRow listed title="Total" value="3" />{/snippet}

{#snippet marqueeSelectionIdle()}<MarqueeSelection
    within={null}
    pointerTypes={['mouse', 'pen', 'touch']}
    slop={() => 4}
    minimum={8}
  />{/snippet}

{#snippet modalDefault()}<Modal title="Rename">Body</Modal>{/snippet}

{#snippet modalSm()}<Modal title="Rename" size="sm">Body</Modal>{/snippet}

{#snippet modalLg()}<Modal title="Rename" size="lg">Body</Modal>{/snippet}

{#snippet modalTop()}<Modal title="Rename" placement="top">Body</Modal>{/snippet}

{#snippet modalFillNarrow()}<Modal title="Rename" fillNarrow>Body</Modal>{/snippet}

{#snippet modalFlushBody()}<Modal title="Rename" flushBody>Body</Modal>{/snippet}

{#snippet modalFooter()}<Modal title="Rename"
    >Body{#snippet footer(close)}<Button onclick={close}>Cancel</Button>{/snippet}</Modal
  >{/snippet}

{#snippet modalInfoFooter()}<Modal title="About" infoFooter
    >Body{#snippet footer()}<p>Version 1</p>{/snippet}</Modal
  >{/snippet}

{#snippet modalWithoutCloseButton()}<Modal title="Rename" closeButton={false} closeLabel="Close"
    >Body</Modal
  >{/snippet}

{#snippet modalCustomHeader()}<Modal aria-label="Search"
    >{#snippet header(close)}<Button onclick={close}>Back</Button>{/snippet}Body</Modal
  >{/snippet}

{#snippet modalLabelledBy()}<Modal aria-labelledby="dialog-heading"
    ><h2 id="dialog-heading">Rename</h2></Modal
  >{/snippet}

{#snippet navLinkDefault()}<NavLink href="/library">Library</NavLink>{/snippet}

{#snippet navLinkCurrent()}<NavLink href="/library" current>Library</NavLink>{/snippet}

{#snippet navLinkStrong()}<NavLink href="/library" strong>Library</NavLink>{/snippet}

{#snippet navLinkIcon()}<NavLink href="/library"
    >{#snippet icon()}<LayoutGrid />{/snippet}Library</NavLink
  >{/snippet}

{#snippet overflowListFits()}<OverflowList
    items={NAMES.slice(0, 2)}
    room={3}
    name={(n) => n}
    label="Readers">{#snippet item(n)}<Tag>{n}</Tag>{/snippet}</OverflowList
  >{/snippet}

{#snippet overflowListOverflowing()}<OverflowList
    items={NAMES}
    room={3}
    name={(n) => n}
    label="Readers">{#snippet item(n)}<Tag>{n}</Tag>{/snippet}</OverflowList
  >{/snippet}

{#snippet overflowListInline()}<OverflowList
    inline
    items={NAMES}
    room={3}
    name={(n) => n}
    moreLabel="others">{#snippet item(n)}<Tag>{n}</Tag>{/snippet}</OverflowList
  >{/snippet}

{#snippet pageHeaderDefault()}<PageHeader title="Settings" />{/snippet}

{#snippet pageHeaderMetaLang()}<PageHeader title="設定" lang="ja" meta="3 sections" />{/snippet}

{#snippet pageHeaderBack()}<PageHeader title="Settings" backHref="/" />{/snippet}

{#snippet pageHeaderBackCompact()}<PageHeader
    title="Settings"
    backHref="/"
    backLabel="Library"
    compact
  />{/snippet}

{#snippet paginationFirst()}<Pagination total={5} />{/snippet}

{#snippet paginationMiddle()}<Pagination total={10} page={5} />{/snippet}

{#snippet paginationLast()}<Pagination total={5} page={5} />{/snippet}

{#snippet paginationLinks()}<Pagination total={5} page={2} href={(p) => '/page/' + p} />{/snippet}

{#snippet popoverDefault()}<Popover label="Filters"
    >{#snippet trigger(props)}<button {...props} class="btn">Filters</button>{/snippet}
    <p>Body</p></Popover
  >{/snippet}

{#snippet progressDefault()}<Progress label="Upload" value={40} />{/snippet}

{#snippet progressIndeterminate()}<Progress label="Upload" />{/snippet}

{#snippet progressSuccess()}<Progress label="Upload" value={40} variant="success" />{/snippet}

{#snippet progressWarning()}<Progress label="Upload" value={40} variant="warning" />{/snippet}

{#snippet progressDanger()}<Progress label="Upload" value={40} variant="danger" />{/snippet}

{#snippet progressAccent()}<Progress label="Upload" value={40} variant="accent" />{/snippet}

{#snippet progressSm()}<Progress label="Upload" value={40} size="sm" />{/snippet}

{#snippet progressLgMax()}<Progress label="Upload" value={3} max={4} size="lg" />{/snippet}

{#snippet radioDefault()}<Radio name="dir" value="ltr">Left to right</Radio>{/snippet}

{#snippet radioHint()}<Radio name="dir" value="ltr" hint="Most books">Left to right</Radio
  >{/snippet}

{#snippet radioTile()}<Radio name="dir" value="ltr" variant="tile">Left to right</Radio>{/snippet}

{#snippet radioBare()}<Radio name="dir" value="ltr" aria-label="Left to right" />{/snippet}

{#snippet searchFieldDefault()}<SearchField label="Search" />{/snippet}

{#snippet searchFieldHiddenLabel()}<SearchField
    label="Search"
    hideLabel
    placeholder="Title or author"
  />{/snippet}

{#snippet searchFieldClearableEmpty()}<SearchField label="Search" clearable />{/snippet}

{#snippet searchFieldClearableFilled()}<SearchField
    label="Search"
    clearable
    value="moby"
  />{/snippet}

{#snippet searchFieldTextWithId()}<SearchField
    label="Search"
    type="text"
    id="library-search"
  />{/snippet}

{#snippet segmentedControlDefault()}<SegmentedControl
    label="View"
    options={OPTIONS}
    value="grid"
  />{/snippet}

{#snippet segmentedControlGhost()}<SegmentedControl
    label="View"
    options={OPTIONS}
    value="grid"
    variant="ghost"
  />{/snippet}

{#snippet segmentedControlOutline()}<SegmentedControl
    label="View"
    options={OPTIONS}
    value="grid"
    variant="outline"
  />{/snippet}

{#snippet segmentedControlTrack()}<SegmentedControl
    label="View"
    options={OPTIONS}
    value="grid"
    variant="track"
  />{/snippet}

{#snippet segmentedControlTrackDisabledOption()}<SegmentedControl
    label="View"
    options={OPTIONS_WITH_DISABLED}
    value="grid"
    variant="track"
  />{/snippet}

{#snippet segmentedControlUnlabelled()}<SegmentedControl options={OPTIONS} />{/snippet}

{#snippet selectDefault()}<Select
    ><option value="a">Newest</option><option value="b">Oldest</option></Select
  >{/snippet}

{#snippet settingsRowDefault()}<SettingsRow label="Theme"
    ><Button size="sm">Ember</Button></SettingsRow
  >{/snippet}

{#snippet skeletonDefault()}<Skeleton />{/snippet}

{#snippet skeletonText()}<Skeleton shape="text" />{/snippet}

{#snippet skeletonTitle()}<Skeleton shape="title" />{/snippet}

{#snippet skeletonCircle()}<Skeleton shape="circle" />{/snippet}

{#snippet skeletonBlock()}<Skeleton shape="block" />{/snippet}

{#snippet skeletonWidth()}<Skeleton shape="text" width="60%" />{/snippet}

{#snippet sliderDefault()}<Slider label="Zoom" value={50} max={100} />{/snippet}

{#snippet sliderValuetextStep()}<Slider
    label="Zoom"
    value={2}
    min={1}
    max={4}
    step={0.5}
    valuetext="200%"
  />{/snippet}

{#snippet sliderRtl()}<Slider label="Page" value={3} max={10} dir="rtl" />{/snippet}

{#snippet sliderTicks()}<Slider label="Zoom" value={50} max={100} ticks={[0, 50, 100]} />{/snippet}

{#snippet statDefault()}<Stat label="Books" value="42" />{/snippet}

{#snippet statDeltaUp()}<Stat label="Books" value="42" delta="+3" trend="up" />{/snippet}

{#snippet statDeltaDown()}<Stat label="Books" value="42" delta="-1" trend="down" />{/snippet}

{#snippet statDeltaFlat()}<Stat label="Books" value="42" delta="0" />{/snippet}

{#snippet statSm()}<Stat label="Books" value="42" size="sm" />{/snippet}

{#snippet statListed()}<dl>
    <Stat label="Books" value="42" delta="+3" trend="up" listed />
  </dl>{/snippet}

{#snippet statusIconInfo()}<StatusIcon variant="info" />{/snippet}

{#snippet statusIconSuccess()}<StatusIcon variant="success" />{/snippet}

{#snippet statusIconWarning()}<StatusIcon variant="warning" />{/snippet}

{#snippet statusIconDanger()}<StatusIcon variant="danger" />{/snippet}

{#snippet stepItemDefault()}<StepItem title="Pick a file">Choose an EPUB.</StepItem>{/snippet}

{#snippet stepItemTitleOnlyH4()}<StepItem title="Pick a file" heading="h4" />{/snippet}

{#snippet stepListDefault()}<StepList
    ><StepItem title="Pick a file" /><StepItem title="Wait" /></StepList
  >{/snippet}

{#snippet stepperLinks()}<Stepper
    steps={{ previous: '/page/1', next: '/page/3', count: '2 / 9' }}
  />{/snippet}

{#snippet stepperActionsBlock()}<Stepper
    axis="block"
    steps={{ previous: () => {}, next: () => {}, count: null }}
  />{/snippet}

{#snippet stepperMissingDisabled()}<Stepper
    steps={{ previous: null, next: '/page/2', count: '1 / 9' }}
  />{/snippet}

{#snippet stepperMissingHidden()}<Stepper
    missingStep="hidden"
    steps={{ previous: null, next: '/page/2', count: '1 / 9' }}
  />{/snippet}

{#snippet stepperStatusSpaced()}<Stepper
    countAs="status"
    spaced
    steps={{ previous: '/page/1', next: '/page/3', count: '2 / 9' }}><span>Chapter 2</span></Stepper
  >{/snippet}

{#snippet stepperNoSteps()}<Stepper steps={null}><span>Chapter 2</span></Stepper>{/snippet}

{#snippet tableDefault()}<Table
    ><TableHeader
      ><TableRow
        ><TableHeaderCell>Title</TableHeaderCell><TableHeaderCell numeric>Pages</TableHeaderCell
        ><TableHeaderCell actions>Actions</TableHeaderCell></TableRow
      ></TableHeader
    ><TableBody
      ><TableRow
        ><TableCell>Moby Dick</TableCell><TableCell numeric>635</TableCell><TableCell actions
          ><Button size="sm">Open</Button></TableCell
        ></TableRow
      ></TableBody
    ></Table
  >{/snippet}

{#snippet tableStripedSmCaption()}<Table striped size="sm" caption="Books"
    ><TableBody><TableRow><TableCell>Moby Dick</TableCell></TableRow></TableBody></Table
  >{/snippet}

{#snippet tableBodyDefault()}<table><TableBody><tr><td>Cell</td></tr></TableBody></table>{/snippet}

{#snippet tableCellDefault()}<table>
    <tbody><tr><TableCell>Moby Dick</TableCell></tr></tbody>
  </table>{/snippet}

{#snippet tableCellNumeric()}<table>
    <tbody><tr><TableCell numeric>635</TableCell></tr></tbody>
  </table>{/snippet}

{#snippet tableCellActions()}<table>
    <tbody><tr><TableCell actions><Button size="sm">Open</Button></TableCell></tr></tbody>
  </table>{/snippet}

{#snippet tableHeaderDefault()}<table>
    <TableHeader><tr><th>Title</th></tr></TableHeader>
  </table>{/snippet}

{#snippet tableHeaderCellDefault()}<table>
    <thead><tr><TableHeaderCell>Title</TableHeaderCell></tr></thead>
  </table>{/snippet}

{#snippet tableHeaderCellNumeric()}<table>
    <thead><tr><TableHeaderCell numeric>Pages</TableHeaderCell></tr></thead>
  </table>{/snippet}

{#snippet tableHeaderCellActions()}<table>
    <thead><tr><TableHeaderCell actions>Actions</TableHeaderCell></tr></thead>
  </table>{/snippet}

{#snippet tableRowDefault()}<table>
    <tbody><TableRow><td>Cell</td></TableRow></tbody>
  </table>{/snippet}

{#snippet tableOfContentsDefault()}<TableOfContents entries={ENTRIES} />{/snippet}

{#snippet tableOfContentsCurrentEntry()}<TableOfContents
    entries={ENTRIES}
    current="fonts"
  />{/snippet}

{#snippet tableOfContentsTitledH3()}<TableOfContents
    entries={ENTRIES}
    title="Contents"
    heading="h3"
  />{/snippet}

{#snippet tabsUnderline()}<Tabs label="Library" tabs={TABS}
    >{#snippet panel(tab)}<p>{tab.label} panel</p>{/snippet}</Tabs
  >{/snippet}

{#snippet tabsPill()}<Tabs label="Library" tabs={TABS} variant="pill"
    >{#snippet panel(tab)}<p>{tab.label} panel</p>{/snippet}</Tabs
  >{/snippet}

{#snippet tabsSecondSelected()}<Tabs label="Library" tabs={TABS} selected="notes"
    >{#snippet panel(tab)}<p>{tab.label} panel</p>{/snippet}</Tabs
  >{/snippet}

{#snippet tabsDisabledTab()}<Tabs label="Library" tabs={TABS_WITH_DISABLED}
    >{#snippet panel(tab)}<p>{tab.label} panel</p>{/snippet}</Tabs
  >{/snippet}

{#snippet tabsActions()}<Tabs label="Library" tabs={TABS}
    >{#snippet panel(tab)}<p>{tab.label} panel</p>{/snippet}{#snippet actions()}<Button size="sm"
        >Add</Button
      >{/snippet}</Tabs
  >{/snippet}

{#snippet tagDefault()}<Tag>Fiction</Tag>{/snippet}

{#snippet tagLink()}<Tag href="/tags/fiction">Fiction</Tag>{/snippet}

{#snippet tagRemovable()}<Tag onremove={() => {}} removeLabel="Remove Fiction">Fiction</Tag
  >{/snippet}

{#snippet tagColorSlate()}<Tag color="slate">Fiction</Tag>{/snippet}

{#snippet tagColorClay()}<Tag color="clay">Fiction</Tag>{/snippet}

{#snippet tagColorSage()}<Tag color="sage">Fiction</Tag>{/snippet}

{#snippet tagColorPlum()}<Tag color="plum">Fiction</Tag>{/snippet}

{#snippet tagColorRose()}<Tag color="rose">Fiction</Tag>{/snippet}

{#snippet tagColorIce()}<Tag color="ice">Fiction</Tag>{/snippet}

{#snippet tagColorRuby()}<Tag color="ruby">Fiction</Tag>{/snippet}

{#snippet tagColorCopper()}<Tag color="copper">Fiction</Tag>{/snippet}

{#snippet tagColorOlive()}<Tag color="olive">Fiction</Tag>{/snippet}

{#snippet tagColorFern()}<Tag color="fern">Fiction</Tag>{/snippet}

{#snippet tagColorCyan()}<Tag color="cyan">Fiction</Tag>{/snippet}

{#snippet tagColorSky()}<Tag color="sky">Fiction</Tag>{/snippet}

{#snippet tagColorIndigo()}<Tag color="indigo">Fiction</Tag>{/snippet}

{#snippet tagColorViolet()}<Tag color="violet">Fiction</Tag>{/snippet}

{#snippet tagColorMagenta()}<Tag color="magenta">Fiction</Tag>{/snippet}

{#snippet tagColorStone()}<Tag color="stone">Fiction</Tag>{/snippet}

{#snippet tagToggleDefault()}<TagToggle>Fiction</TagToggle>{/snippet}

{#snippet tagTogglePressed()}<TagToggle pressed>Fiction</TagToggle>{/snippet}

{#snippet tagToggleColor()}<TagToggle color="sage">Fiction</TagToggle>{/snippet}

{#snippet textareaDefault()}<Textarea rows={3} />{/snippet}

{#snippet textareaPlaceholder()}<Textarea placeholder="Write a note" />{/snippet}

{#snippet thumbnailImage()}<Thumbnail src="/cover.png" alt="Moby Dick" />{/snippet}

{#snippet thumbnailNamed()}<Thumbnail src={null} alt="Moby Dick" />{/snippet}

{#snippet thumbnailBlank()}<Thumbnail src={null} />{/snippet}

{#snippet thumbnailSmSquare()}<Thumbnail src="/cover.png" size="sm" ratio="square" />{/snippet}

{#snippet thumbnailLgVideo()}<Thumbnail src="/cover.png" size="lg" ratio="video" />{/snippet}

{#snippet thumbnailFillBordered()}<Thumbnail src="/cover.png" fill bordered />{/snippet}

{#snippet toastInfo()}<Toast
    toast={TOASTS.info.toast}
    toaster={TOASTS.info.toaster}
    dismissLabel="Dismiss"
  />{/snippet}

{#snippet toastSuccess()}<Toast
    toast={TOASTS.success.toast}
    toaster={TOASTS.success.toaster}
    dismissLabel="Dismiss"
  />{/snippet}

{#snippet toastWarning()}<Toast
    toast={TOASTS.warning.toast}
    toaster={TOASTS.warning.toaster}
    dismissLabel="Dismiss"
  />{/snippet}

{#snippet toastDanger()}<Toast
    toast={TOASTS.danger.toast}
    toaster={TOASTS.danger.toaster}
    dismissLabel="Dismiss"
  />{/snippet}

{#snippet toastMessage()}<Toast
    toast={TOASTS.message.toast}
    toaster={TOASTS.message.toaster}
    dismissLabel="Dismiss"
  />{/snippet}

{#snippet toastTimed()}<Toast
    toast={TOASTS.timed.toast}
    toaster={TOASTS.timed.toaster}
    dismissLabel="Dismiss"
  />{/snippet}

{#snippet toastAction()}<Toast
    toast={TOASTS.action.toast}
    toaster={TOASTS.action.toaster}
    dismissLabel="Dismiss"
  />{/snippet}

{#snippet toastClearanceDefault()}<ToastClearance blockEnd={48} />{/snippet}

{#snippet toastRegionBottom()}<ToastRegion toaster={REGION_TOASTER} />{/snippet}

{#snippet toastRegionTop()}<ToastRegion toaster={REGION_TOASTER} placement="top" />{/snippet}

{#snippet toastRegionCleared()}<ToastRegion toaster={CLEARED_TOASTER} />{/snippet}

{#snippet toastRegionWithoutClearance()}<ToastRegion
    toaster={CLEARED_TOASTER}
    clearance={false}
  />{/snippet}

{#snippet toggleDefault()}<Toggle>Sync</Toggle>{/snippet}

{#snippet toggleChecked()}<Toggle checked>Sync</Toggle>{/snippet}

{#snippet toggleDisabled()}<Toggle disabled>Sync</Toggle>{/snippet}

{#snippet windowDropzoneIdle()}<WindowDropzone onfiles={() => {}}>Drop to add</WindowDropzone
  >{/snippet}
